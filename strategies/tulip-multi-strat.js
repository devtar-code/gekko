var _ = require('lodash');
var log = require('../core/log.js');

var method = {};
method.init = function() {
    // strat name
    this.name = 'tulip-multi-strat';
    // trend information
    this.trend = 'none'
    // tulip indicators use this sometimes
    this.requiredHistory = this.settings.historySize;
    
    // Check if Tulip indicators are available
    if (typeof this.addTulipIndicator === 'function') {
        // define the indicators we need
        this.addTulipIndicator('myadx', 'adx', this.settings);
        this.addTulipIndicator('mymacd', 'macd', this.settings);
        this.tulipAvailable = true;
    } else {
        log.warn('Tulip indicators not available, using fallback strategy');
        this.tulipAvailable = false;
        // Fallback to basic indicators
        this.addIndicator('sma', 'SMA', this.settings.sma || 20);
        this.addIndicator('rsi', 'RSI', this.settings.rsi || 14);
    }
}

// what happens on every new candle?
method.update = function(candle) {
    if (this.tulipAvailable) {
        // tulip results
        this.adx = this.tulipIndicators.myadx.result.result;
        this.macd = this.tulipIndicators.mymacd.result.macdHistogram;
    } else {
        // fallback results
        this.sma = this.indicators.sma.result;
        this.rsi = this.indicators.rsi.result;
    }
}

// for debugging purposes log the last
// calculated parameters.
method.log = function() {
    if (this.tulipAvailable) {
        log.debug(
`---------------------
Tulip ADX: ${this.adx}
Tulip MACD: ${this.macd}
`);
    } else {
        log.debug(
`---------------------
SMA: ${this.sma}
RSI: ${this.rsi}
`);
    }
}

method.check = function() {
    if (this.tulipAvailable) {
        // just add a long and short to each array when new indicators are used
        const all_long = [
            this.adx > this.settings.up && this.trend!=='long',
            this.settings.macd_up < this.macd && this.trend!=='long',
        ].reduce((total, long)=>long && total, true)
        const all_short = [
            this.adx < this.settings.down && this.trend!=='short',
            this.settings.macd_down > this.macd && this.trend!=='short',
        ].reduce((total, long)=>long && total, true)

        // combining all indicators with AND
        if(all_long){
            log.debug(`tulip-multi-strat In low`);
            this.advice('long');
        }else if(all_short){
            log.debug(`tulip-multi-strat In high`);
            this.advice('short');
        }else{
            log.debug(`tulip-multi-strat In no trend`);
            this.advice();
        }
    } else {
        // Fallback strategy using SMA and RSI
        const price = this.candle.close;
        const sma = this.sma;
        const rsi = this.rsi;
        
        if (price > sma && rsi < 70 && this.trend !== 'long') {
            log.debug(`Fallback strategy: BUY signal`);
            this.trend = 'long';
            this.advice('long');
        } else if (price < sma && rsi > 30 && this.trend !== 'short') {
            log.debug(`Fallback strategy: SELL signal`);
            this.trend = 'short';
            this.advice('short');
        } else {
            log.debug(`Fallback strategy: No signal`);
            this.advice();
        }
    }
}

module.exports = method;
