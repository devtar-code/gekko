const _ = require('lodash');
const moment = require('moment');

class OrderManager {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      orderTimeout: config.orderTimeout || 30000,
      ...config
    };
    
    this.orders = new Map();
    this.pendingOrders = new Map();
    this.orderHistory = [];
    this.ocoOrders = new Map();
    this.trailingStops = new Map();
  }

  // Place a basic market order
  async placeMarketOrder(symbol, side, size, exchange) {
    const order = {
      id: this.generateOrderId(),
      symbol,
      side: side.toUpperCase(),
      type: 'MARKET',
      size,
      status: 'PENDING',
      timestamp: moment(),
      exchange,
      retries: 0
    };

    this.pendingOrders.set(order.id, order);
    
    try {
      const result = await this.executeOrder(order, exchange);
      this.orders.set(order.id, result);
      this.pendingOrders.delete(order.id);
      this.orderHistory.push(result);
      return result;
    } catch (error) {
      await this.handleOrderError(order, error);
      throw error;
    }
  }

  // Place a limit order
  async placeLimitOrder(symbol, side, size, price, exchange) {
    const order = {
      id: this.generateOrderId(),
      symbol,
      side: side.toUpperCase(),
      type: 'LIMIT',
      size,
      price,
      status: 'PENDING',
      timestamp: moment(),
      exchange,
      retries: 0
    };

    this.pendingOrders.set(order.id, order);
    
    try {
      const result = await this.executeOrder(order, exchange);
      this.orders.set(order.id, result);
      this.pendingOrders.delete(order.id);
      this.orderHistory.push(result);
      return result;
    } catch (error) {
      await this.handleOrderError(order, error);
      throw error;
    }
  }

  // Place an OCO (One-Cancels-Other) order
  async placeOCOOrder(symbol, side, size, limitPrice, stopPrice, exchange) {
    const ocoId = this.generateOrderId();
    
    const limitOrder = {
      id: `${ocoId}_LIMIT`,
      symbol,
      side: side.toUpperCase(),
      type: 'LIMIT',
      size,
      price: limitPrice,
      status: 'PENDING',
      timestamp: moment(),
      exchange,
      ocoId,
      isOCO: true
    };

    const stopOrder = {
      id: `${ocoId}_STOP`,
      symbol,
      side: side.toUpperCase(),
      type: 'STOP',
      size,
      price: stopPrice,
      status: 'PENDING',
      timestamp: moment(),
      exchange,
      ocoId,
      isOCO: true
    };

    const ocoOrder = {
      id: ocoId,
      limitOrder,
      stopOrder,
      status: 'ACTIVE',
      timestamp: moment()
    };

    this.ocoOrders.set(ocoId, ocoOrder);
    
    // Place both orders
    try {
      const [limitResult, stopResult] = await Promise.all([
        this.executeOrder(limitOrder, exchange),
        this.executeOrder(stopOrder, exchange)
      ]);

      ocoOrder.limitOrder = limitResult;
      ocoOrder.stopOrder = stopResult;
      
      return ocoOrder;
    } catch (error) {
      await this.cancelOCOOrder(ocoId, exchange);
      throw error;
    }
  }

  // Place a trailing stop order
  async placeTrailingStop(symbol, side, size, trailPercent, exchange) {
    const order = {
      id: this.generateOrderId(),
      symbol,
      side: side.toUpperCase(),
      type: 'TRAILING_STOP',
      size,
      trailPercent,
      status: 'ACTIVE',
      timestamp: moment(),
      exchange,
      currentPrice: null,
      triggerPrice: null
    };

    this.trailingStops.set(order.id, order);
    return order;
  }

  // Update trailing stop with current price
  updateTrailingStop(orderId, currentPrice) {
    const order = this.trailingStops.get(orderId);
    if (!order || order.status !== 'ACTIVE') return;

    order.currentPrice = currentPrice;
    
    if (order.side === 'BUY') {
      // For buy orders, trail below current price
      const newTriggerPrice = currentPrice * (1 - order.trailPercent / 100);
      if (!order.triggerPrice || newTriggerPrice > order.triggerPrice) {
        order.triggerPrice = newTriggerPrice;
      }
    } else {
      // For sell orders, trail above current price
      const newTriggerPrice = currentPrice * (1 + order.trailPercent / 100);
      if (!order.triggerPrice || newTriggerPrice < order.triggerPrice) {
        order.triggerPrice = newTriggerPrice;
      }
    }

    // Check if trailing stop should be triggered
    this.checkTrailingStopTrigger(order, currentPrice);
  }

  // Place a time-weighted average price (TWAP) order
  async placeTWAPOrder(symbol, side, totalSize, duration, exchange) {
    const order = {
      id: this.generateOrderId(),
      symbol,
      side: side.toUpperCase(),
      type: 'TWAP',
      totalSize,
      remainingSize: totalSize,
      duration,
      startTime: moment(),
      endTime: moment().add(duration, 'seconds'),
      status: 'ACTIVE',
      timestamp: moment(),
      exchange,
      childOrders: []
    };

    this.orders.set(order.id, order);
    
    // Start TWAP execution
    this.executeTWAPOrder(order, exchange);
    
    return order;
  }

  // Execute TWAP order by splitting into smaller orders
  async executeTWAPOrder(order, exchange) {
    const interval = Math.floor(order.duration / 10); // Split into 10 orders
    const orderSize = order.totalSize / 10;
    
    for (let i = 0; i < 10; i++) {
      if (order.status !== 'ACTIVE') break;
      
      try {
        const childOrder = await this.placeMarketOrder(
          order.symbol,
          order.side,
          orderSize,
          exchange
        );
        
        order.childOrders.push(childOrder);
        order.remainingSize -= orderSize;
        
        // Wait for next interval
        await this.sleep(interval * 1000);
      } catch (error) {
        console.error(`TWAP child order failed:`, error);
        order.status = 'FAILED';
        break;
      }
    }
    
    if (order.remainingSize <= 0) {
      order.status = 'COMPLETED';
    }
  }

  // Cancel an order
  async cancelOrder(orderId, exchange) {
    const order = this.orders.get(orderId) || this.pendingOrders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    try {
      await exchange.cancelOrder(orderId);
      order.status = 'CANCELLED';
      order.cancelledAt = moment();
      
      this.orderHistory.push(order);
      return order;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

  // Cancel OCO order
  async cancelOCOOrder(ocoId, exchange) {
    const ocoOrder = this.ocoOrders.get(ocoId);
    if (!ocoOrder) {
      throw new Error(`OCO order ${ocoId} not found`);
    }

    try {
      await Promise.all([
        this.cancelOrder(ocoOrder.limitOrder.id, exchange),
        this.cancelOrder(ocoOrder.stopOrder.id, exchange)
      ]);
      
      ocoOrder.status = 'CANCELLED';
      ocoOrder.cancelledAt = moment();
      return ocoOrder;
    } catch (error) {
      console.error(`Failed to cancel OCO order ${ocoId}:`, error);
      throw error;
    }
  }

  // Get order status
  getOrderStatus(orderId) {
    return this.orders.get(orderId) || this.pendingOrders.get(orderId);
  }

  // Get all active orders
  getActiveOrders() {
    return Array.from(this.orders.values()).filter(order => 
      ['ACTIVE', 'PENDING', 'PARTIAL'].includes(order.status)
    );
  }

  // Get order history
  getOrderHistory(filters = {}) {
    let history = this.orderHistory;
    
    if (filters.symbol) {
      history = history.filter(order => order.symbol === filters.symbol);
    }
    
    if (filters.side) {
      history = history.filter(order => order.side === filters.side);
    }
    
    if (filters.status) {
      history = history.filter(order => order.status === filters.status);
    }
    
    if (filters.startDate) {
      history = history.filter(order => 
        moment(order.timestamp).isAfter(filters.startDate)
      );
    }
    
    if (filters.endDate) {
      history = history.filter(order => 
        moment(order.timestamp).isBefore(filters.endDate)
      );
    }
    
    return history.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Execute order on exchange
  async executeOrder(order, exchange) {
    try {
      const result = await exchange.createOrder(
        order.symbol,
        order.type,
        order.side,
        order.size,
        order.price
      );
      
      return {
        ...order,
        ...result,
        status: 'FILLED',
        filledAt: moment()
      };
    } catch (error) {
      throw new Error(`Order execution failed: ${error.message}`);
    }
  }

  // Handle order errors with retry logic
  async handleOrderError(order, error) {
    order.retries++;
    order.lastError = error.message;
    
    if (order.retries < this.config.maxRetries) {
      console.log(`Retrying order ${order.id}, attempt ${order.retries + 1}`);
      await this.sleep(this.config.retryDelay * order.retries);
      
      try {
        const result = await this.executeOrder(order, order.exchange);
        this.orders.set(order.id, result);
        this.pendingOrders.delete(order.id);
        this.orderHistory.push(result);
        return result;
      } catch (retryError) {
        return this.handleOrderError(order, retryError);
      }
    } else {
      order.status = 'FAILED';
      order.failedAt = moment();
      this.orderHistory.push(order);
      this.pendingOrders.delete(order.id);
    }
  }

  // Check if trailing stop should be triggered
  checkTrailingStopTrigger(order, currentPrice) {
    if (!order.triggerPrice) return;

    let shouldTrigger = false;
    
    if (order.side === 'BUY' && currentPrice <= order.triggerPrice) {
      shouldTrigger = true;
    } else if (order.side === 'SELL' && currentPrice >= order.triggerPrice) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      this.executeTrailingStop(order, currentPrice);
    }
  }

  // Execute trailing stop order
  async executeTrailingStop(order, currentPrice) {
    try {
      const result = await this.placeMarketOrder(
        order.symbol,
        order.side,
        order.size,
        order.exchange
      );
      
      order.status = 'TRIGGERED';
      order.triggeredAt = moment();
      order.triggerPrice = currentPrice;
      order.executedOrder = result;
      
      this.trailingStops.delete(order.id);
      this.orderHistory.push(order);
      
      return result;
    } catch (error) {
      console.error(`Trailing stop execution failed:`, error);
      order.status = 'FAILED';
      order.failedAt = moment();
    }
  }

  // Generate unique order ID
  generateOrderId() {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get order statistics
  getOrderStatistics() {
    const totalOrders = this.orderHistory.length;
    const filledOrders = this.orderHistory.filter(o => o.status === 'FILLED').length;
    const cancelledOrders = this.orderHistory.filter(o => o.status === 'CANCELLED').length;
    const failedOrders = this.orderHistory.filter(o => o.status === 'FAILED').length;
    
    return {
      total: totalOrders,
      filled: filledOrders,
      cancelled: cancelledOrders,
      failed: failedOrders,
      successRate: totalOrders > 0 ? (filledOrders / totalOrders) * 100 : 0
    };
  }
}

module.exports = OrderManager;
