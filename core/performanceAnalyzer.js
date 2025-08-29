const _ = require('lodash');
const moment = require('moment');

class PerformanceAnalyzer {
  constructor() {
    this.trades = [];
    this.portfolioValues = [];
    this.returns = [];
  }

  addTrade(trade) {
    this.trades.push({
      ...trade,
      timestamp: moment(trade.timestamp || Date.now())
    });
  }

  addPortfolioValue(value, timestamp) {
    this.portfolioValues.push({
      value,
      timestamp: moment(timestamp || Date.now())
    });
  }

  calculateSharpeRatio(riskFreeRate = 0.02) {
    if (this.returns.length < 2) return 0;
    
    const meanReturn = _.mean(this.returns);
    const stdDev = this.calculateStandardDeviation(this.returns);
    
    if (stdDev === 0) return 0;
    
    return (meanReturn - riskFreeRate) / stdDev;
  }

  calculateMaximumDrawdown() {
    if (this.portfolioValues.length < 2) return 0;
    
    let peak = this.portfolioValues[0].value;
    let maxDrawdown = 0;
    
    for (const point of this.portfolioValues) {
      if (point.value > peak) {
        peak = point.value;
      }
      
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  calculateWinRate() {
    if (this.trades.length === 0) return 0;
    
    const winningTrades = this.trades.filter(trade => trade.profit > 0);
    return winningTrades.length / this.trades.length;
  }

  calculateProfitFactor() {
    const winningTrades = this.trades.filter(trade => trade.profit > 0);
    const losingTrades = this.trades.filter(trade => trade.profit < 0);
    
    const grossProfit = _.sumBy(winningTrades, 'profit');
    const grossLoss = Math.abs(_.sumBy(losingTrades, 'profit'));
    
    return grossLoss === 0 ? 0 : grossProfit / grossLoss;
  }

  calculateAverageWin() {
    const winningTrades = this.trades.filter(trade => trade.profit > 0);
    return winningTrades.length > 0 ? _.meanBy(winningTrades, 'profit') : 0;
  }

  calculateAverageLoss() {
    const losingTrades = this.trades.filter(trade => trade.profit < 0);
    return losingTrades.length > 0 ? _.meanBy(losingTrades, 'profit') : 0;
  }

  calculateTotalReturn() {
    if (this.portfolioValues.length < 2) return 0;
    
    const initialValue = this.portfolioValues[0].value;
    const finalValue = this.portfolioValues[this.portfolioValues.length - 1].value;
    
    return (finalValue - initialValue) / initialValue;
  }

  calculateVolatility() {
    return this.calculateStandardDeviation(this.returns);
  }

  calculateStandardDeviation(values) {
    if (values.length < 2) return 0;
    
    const mean = _.mean(values);
    const variance = _.mean(values.map(v => Math.pow(v - mean, 2)));
    return Math.sqrt(variance);
  }

  generatePerformanceReport() {
    return {
      totalTrades: this.trades.length,
      totalReturn: this.calculateTotalReturn(),
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaximumDrawdown(),
      winRate: this.calculateWinRate(),
      profitFactor: this.calculateProfitFactor(),
      averageWin: this.calculateAverageWin(),
      averageLoss: this.calculateAverageLoss(),
      volatility: this.calculateVolatility(),
      trades: this.trades
    };
  }

  calculateReturns() {
    this.returns = [];
    
    for (let i = 1; i < this.portfolioValues.length; i++) {
      const currentValue = this.portfolioValues[i].value;
      const previousValue = this.portfolioValues[i - 1].value;
      const returnValue = (currentValue - previousValue) / previousValue;
      this.returns.push(returnValue);
    }
  }
}

module.exports = PerformanceAnalyzer;
