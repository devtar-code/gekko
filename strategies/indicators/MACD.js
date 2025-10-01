// required indicators
var EMA = require('./EMA.js');

var Indicator = function(config) {
  this.input = 'price';
  this.diff = false;
  
  // Set default values if config is missing
  var short = config && config.short ? config.short : 10;
  var long = config && config.long ? config.long : 21;
  var signal = config && config.signal ? config.signal : 9;
  
  this.short = new EMA(short);
  this.long = new EMA(long);
  this.signal = new EMA(signal);
}

Indicator.prototype.update = function(price) {
  this.short.update(price);
  this.long.update(price);
  this.calculateEMAdiff();
  this.signal.update(this.diff);
  this.result = this.diff - this.signal.result;
}

Indicator.prototype.calculateEMAdiff = function() {
  var shortEMA = this.short.result;
  var longEMA = this.long.result;

  this.diff = shortEMA - longEMA;
}

module.exports = Indicator;
