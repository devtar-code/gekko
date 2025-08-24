// required indicators
var EMA = require('./EMA.js');

var Indicator = function(config) {
  this.result = {};
  this.input = 'price';
  this.macd = 0;
  this.ppo = 0;
  
  // Add safety checks for config parameters with defaults
  if (!config) config = {};
  if (!config.short) config.short = 12;
  if (!config.long) config.long = 26;
  if (!config.signal) config.signal = 9;
  
  this.short = new EMA(config.short);
  this.long = new EMA(config.long);
  this.MACDsignal = new EMA(config.signal);
  this.PPOsignal = new EMA(config.signal);
}

Indicator.prototype.update = function(price) {
  this.short.update(price);
  this.long.update(price);
  this.calculatePPO();
  this.MACDsignal.update(this.result.macd);
  this.MACDhist = this.result.macd - this.MACDsignal.result;
  this.PPOsignal.update(this.result.ppo);
  this.PPOhist = this.result.ppo - this.PPOsignal.result;

  this.result.MACDsignal = this.MACDsignal.result;
  this.result.MACDhist = this.MACDhist;
  this.result.PPOsignal = this.PPOsignal.result;
  this.result.PPOhist = this.PPOhist;
}

Indicator.prototype.calculatePPO = function() {
  this.result.shortEMA = this.short.result;
  this.result.longEMA = this.long.result;
  this.result.macd = this.result.shortEMA - this.result.longEMA;
  this.result.ppo = 100 * (this.result.macd / this.result.longEMA);
}

module.exports = Indicator;
