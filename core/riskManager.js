const _ = require('lodash');
const moment = require('moment');

class RiskManager {
  constructor(config = {}) {
    this.config = {
      maxPortfolioRisk: config.maxPortfolioRisk || 0.02,
      maxPositionSize: config.maxPositionSize || 0.1,
      correlationThreshold: config.correlationThreshold || 0.7,
      ...config
    };
    
    this.positions = new Map();
    this.portfolioValue = 0;
  }

  calculatePositionSize(symbol, price, stopLoss, portfolioValue) {
    const riskPerTrade = portfolioValue * this.config.maxPortfolioRisk;
    const priceRisk = Math.abs(price - stopLoss);
    
    if (priceRisk === 0) return 0;
    
    const positionSize = riskPerTrade / priceRisk;
    return Math.min(positionSize, portfolioValue * this.config.maxPositionSize);
  }

  checkPortfolioStopLoss(currentValue) {
    const drawdown = (this.portfolioValue - currentValue) / this.portfolioValue;
    return drawdown > this.config.maxPortfolioRisk;
  }

  updatePortfolioValue(value) {
    this.portfolioValue = value;
  }
}

module.exports = RiskManager;
