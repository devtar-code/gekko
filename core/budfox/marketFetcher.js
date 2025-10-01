//
// The fetcher is responsible for fetching new
// market data at the exchange on interval. It will emit
// the following events:
//
// - `trades batch` - all new trades.
// - `trade` - the most recent trade after every fetch

const _ = require('lodash');
const moment = require('moment');
const utc = moment.utc;
const util = require(__dirname + '/../util');
const dirs = util.dirs();

const config = util.getConfig();
const log = require(dirs.core + 'log');
const exchangeChecker = require(dirs.gekko + 'exchange/exchangeChecker');

const TradeBatcher = require(util.dirs().budfox + 'tradeBatcher');

const Fetcher = function(config) {
  if(!_.isObject(config))
    throw new Error('TradeFetcher expects a config');

  const exchangeName = config.watch.exchange.toLowerCase();
  const DataProvider = require(util.dirs().gekko + 'exchange/wrappers/' + exchangeName);
  // Ensure all handler methods have the correct `this`
  _.bindAll(this, '_fetch', 'fetch', 'processTrades', 'relayTrades', 'handleTimeout');

  // Create a public dataProvider object which can retrieve live
  // trade information from an exchange.
  this.exchangeTrader = new DataProvider(config.watch);

  this.exchange = exchangeChecker.settings(config.watch);

  // Set default candleSize if tradingAdvisor is not enabled
  var candleSize = config.tradingAdvisor && config.tradingAdvisor.enabled ? 
    config.tradingAdvisor.candleSize : 1;
  var historySize = config.tradingAdvisor && config.tradingAdvisor.enabled ? 
    config.tradingAdvisor.historySize : 10;
  var requiredHistory = candleSize * historySize;

  // If the trading adviser is enabled we might need a very specific fetch since
  // to line up [local db, trading method, and fetching]
  if(config.tradingAdvisor && config.tradingAdvisor.enabled && config.tradingAdvisor.firstFetchSince) {
    this.firstSince = config.tradingAdvisor.firstFetchSince;

    if(this.exchange.providesHistory === 'date') {
      this.firstSince = moment.unix(this.firstSince).utc();
    }
  }

  this.batcher = new TradeBatcher(this.exchange.tid);

  this.pair = [
    config.watch.asset,
    config.watch.currency
  ].join('/');

  log.info('Starting to watch the market:',
    this.exchange.name,
    this.pair
  );

  // if the exchange returns an error
  // we will keep on retrying until next
  // scheduled fetch.
  this.tries = 0;
  this.limit = 20; // [TODO]
  this.timeout = null;
  this.isFetching = false;

  this.firstFetch = true;

  this.batcher.on('new batch', this.relayTrades);
}

util.makeEventEmitter(Fetcher);

Fetcher.prototype._fetch = function(since) {
  if(++this.tries >= this.limit) {
    log.error('Max retries reached for', this.pair, 'on', this.exchange.name);
    return;
  }

  if(this.isFetching) {
    log.debug('Already fetching, skipping request');
    return;
  }

  this.isFetching = true;
  
  // Set a timeout to prevent hanging
  this.timeout = setTimeout(() => {
    this.isFetching = false;
    log.warn('Fetch timeout for', this.pair, 'on', this.exchange.name);
    this.handleTimeout();
  }, 30000); // 30 second timeout

  try {
    this.exchangeTrader.getTrades(since, this.processTrades, false);
  } catch(err) {
    this.isFetching = false;
    clearTimeout(this.timeout);
    log.error('Error calling getTrades:', err.message);
    this.handleTimeout();
  }
}

Fetcher.prototype.handleTimeout = function() {
  this.isFetching = false;
  if(this.timeout) {
    clearTimeout(this.timeout);
    this.timeout = null;
  }
  
  // Retry after a short delay
  setTimeout(() => {
    this._fetch(false);
  }, 5000);
}

Fetcher.prototype.fetch = function() {
  var since = false;
  if(this.firstFetch) {
    since = this.firstSince;
    this.firstFetch = false;
  } else
    since = false;

  this.tries = 0;
  log.debug('Requested', this.pair, 'trade data from', this.exchange.name, '...');
  this._fetch(since);
}

Fetcher.prototype.processTrades = function(err, trades) {
  // Clear timeout and reset fetching state
  this.isFetching = false;
  if(this.timeout) {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  if(err || _.isEmpty(trades)) {
    if(err) {
      log.warn(this.exchange.name, 'returned an error while fetching trades:', err);
      log.debug('refetching...');
    } else
      log.debug('Trade fetch came back empty, refetching...');
    
    // Use exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, this.tries), 30000);
    setTimeout(() => this._fetch(false), delay);
    return;
  }
  
  log.debug('Received', trades.length, 'trades from', this.exchange.name);
  this.batcher.write(trades);
}

Fetcher.prototype.relayTrades = function(batch) {
  this.emit('trades batch', batch);
}

module.exports = Fetcher;
