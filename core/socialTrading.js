const _ = require('lodash');
const moment = require('moment');

class SocialTrading {
  constructor(config = {}) {
    this.config = {
      maxCopyTraders: config.maxCopyTraders || 10,
      minPerformanceThreshold: config.minPerformanceThreshold || 0.1,
      maxAllocationPerTrader: config.maxAllocationPerTrader || 0.2,
      ...config
    };
    
    this.traders = new Map();
    this.copyTrades = new Map();
    this.strategies = new Map();
    this.performanceHistory = new Map();
  }

  // Register a trader for social trading
  registerTrader(traderId, traderData) {
    const trader = {
      id: traderId,
      name: traderData.name,
      description: traderData.description,
      performance: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
        totalTrades: 0
      },
      followers: [],
      strategies: [],
      isPublic: traderData.isPublic || false,
      createdAt: moment(),
      ...traderData
    };
    
    this.traders.set(traderId, trader);
    return trader;
  }

  // Share a strategy publicly
  shareStrategy(traderId, strategyData) {
    const strategy = {
      id: this.generateId(),
      traderId,
      name: strategyData.name,
      description: strategyData.description,
      code: strategyData.code,
      performance: strategyData.performance || {},
      tags: strategyData.tags || [],
      downloads: 0,
      rating: 0,
      reviews: [],
      createdAt: moment(),
      ...strategyData
    };
    
    this.strategies.set(strategy.id, strategy);
    
    const trader = this.traders.get(traderId);
    if (trader) {
      trader.strategies.push(strategy.id);
    }
    
    return strategy;
  }

  // Follow a trader for copy trading
  followTrader(followerId, traderId, allocation = 0.1) {
    if (allocation > this.config.maxAllocationPerTrader) {
      throw new Error(`Allocation cannot exceed ${this.config.maxAllocationPerTrader * 100}%`);
    }
    
    const trader = this.traders.get(traderId);
    if (!trader) {
      throw new Error('Trader not found');
    }
    
    if (!trader.isPublic) {
      throw new Error('Trader is not public');
    }
    
    // Check if already following
    const existingFollow = trader.followers.find(f => f.id === followerId);
    if (existingFollow) {
      existingFollow.allocation = allocation;
      existingFollow.updatedAt = moment();
    } else {
      trader.followers.push({
        id: followerId,
        allocation,
        joinedAt: moment(),
        updatedAt: moment()
      });
    }
    
    return trader;
  }

  // Execute copy trade
  executeCopyTrade(traderId, trade) {
    const trader = this.traders.get(traderId);
    if (!trader) return;
    
    const copyTrade = {
      id: this.generateId(),
      originalTradeId: trade.id,
      traderId,
      symbol: trade.symbol,
      action: trade.action,
      price: trade.price,
      size: trade.size,
      timestamp: moment(),
      followers: []
    };
    
    // Execute for all followers
    for (const follower of trader.followers) {
      const adjustedSize = trade.size * follower.allocation;
      const followerTrade = {
        ...copyTrade,
        followerId: follower.id,
        size: adjustedSize
      };
      
      this.copyTrades.set(followerTrade.id, followerTrade);
      copyTrade.followers.push(followerTrade);
    }
    
    return copyTrade;
  }

  // Get top performing traders
  getTopTraders(limit = 10) {
    const traders = Array.from(this.traders.values())
      .filter(trader => trader.isPublic)
      .sort((a, b) => b.performance.totalReturn - a.performance.totalReturn)
      .slice(0, limit);
    
    return traders;
  }

  // Get popular strategies
  getPopularStrategies(limit = 10) {
    const strategies = Array.from(this.strategies.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
    
    return strategies;
  }

  // Update trader performance
  updateTraderPerformance(traderId, performance) {
    const trader = this.traders.get(traderId);
    if (trader) {
      trader.performance = {
        ...trader.performance,
        ...performance,
        updatedAt: moment()
      };
      
      // Store performance history
      if (!this.performanceHistory.has(traderId)) {
        this.performanceHistory.set(traderId, []);
      }
      
      this.performanceHistory.get(traderId).push({
        ...performance,
        timestamp: moment()
      });
    }
  }

  // Rate a strategy
  rateStrategy(strategyId, userId, rating, review = '') {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }
    
    const reviewData = {
      userId,
      rating,
      review,
      timestamp: moment()
    };
    
    strategy.reviews.push(reviewData);
    
    // Update average rating
    const totalRating = strategy.reviews.reduce((sum, r) => sum + r.rating, 0);
    strategy.rating = totalRating / strategy.reviews.length;
    
    return strategy;
  }

  // Download a strategy
  downloadStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.downloads++;
      return strategy;
    }
    return null;
  }

  // Get trader analytics
  getTraderAnalytics(traderId) {
    const trader = this.traders.get(traderId);
    if (!trader) return null;
    
    const performanceHistory = this.performanceHistory.get(traderId) || [];
    
    return {
      trader,
      performanceHistory,
      followerCount: trader.followers.length,
      totalAllocation: trader.followers.reduce((sum, f) => sum + f.allocation, 0),
      averageRating: trader.strategies.length > 0 ? 
        trader.strategies.reduce((sum, s) => sum + this.strategies.get(s).rating, 0) / trader.strategies.length : 0
    };
  }

  // Search strategies
  searchStrategies(query, filters = {}) {
    let strategies = Array.from(this.strategies.values());
    
    if (query) {
      strategies = strategies.filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }
    
    if (filters.minRating) {
      strategies = strategies.filter(s => s.rating >= filters.minRating);
    }
    
    if (filters.minPerformance) {
      strategies = strategies.filter(s => s.performance.totalReturn >= filters.minPerformance);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      strategies = strategies.filter(s => 
        filters.tags.some(tag => s.tags.includes(tag))
      );
    }
    
    return strategies.sort((a, b) => b.rating - a.rating);
  }

  // Generate unique ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Get copy trade history
  getCopyTradeHistory(followerId) {
    return Array.from(this.copyTrades.values())
      .filter(trade => trade.followerId === followerId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get strategy performance
  getStrategyPerformance(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return null;
    
    return {
      strategy,
      downloads: strategy.downloads,
      averageRating: strategy.rating,
      reviewCount: strategy.reviews.length,
      performance: strategy.performance
    };
  }
}

module.exports = SocialTrading;
