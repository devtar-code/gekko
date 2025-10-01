var _ = require('lodash');
var util = require('../util');
var config = util.getConfig();
var dirs = util.dirs();
var log = require(dirs.core + 'log');
var moment = require('moment');
var gekkoEnv = util.gekkoEnv();

var adapter = config[config.adapter];
var daterange = config.importer.daterange;

var from = moment.utc(daterange.from);

if(daterange.to) {
  var to = moment.utc(daterange.to);
} else {
  var to = moment().utc();
  log.debug(
    'No end date specified for importing, setting to',
    to.format()
  );
}
log.debug(to.format());

if(!from.isValid())
  util.die('invalid `from`');

if(!to.isValid())
  util.die('invalid `to`');

var TradeBatcher = require(dirs.budfox + 'tradeBatcher');
var CandleManager = require(dirs.budfox + 'candleManager');
var exchangeChecker = require(dirs.gekko + 'exchange/exchangeChecker');

var error = exchangeChecker.cantFetchFullHistory(config.watch);
if(error)
  util.die(error, true);

var fetcher = require(dirs.importers + config.watch.exchange);

if(to <= from)
  util.die('This daterange does not make sense.')

var Market = function() {
  _.bindAll(this);
  this.exchangeSettings = exchangeChecker.settings(config.watch);

  // Ensure tid is a valid string, default to 'tid' if not provided
  var tid = this.exchangeSettings.tid;
  if (!tid || !_.isString(tid)) {
    log.warn('Exchange settings missing valid tid, defaulting to "tid"');
    tid = 'tid';
  }

  this.tradeBatcher = new TradeBatcher(tid);
  this.candleManager = new CandleManager;
  this.fetcher = fetcher({
    to: to,
    from: from
  });

  this.done = false;

  this.fetcher.bus.on(
    'trades',
    this.processTrades
  );

  this.fetcher.bus.on(
    'done',
    function() {
      this.done = true;
    }.bind(this)
  )

  this.tradeBatcher.on(
    'new batch',
    this.candleManager.processTrades
  );

  this.candleManager.on(
    'candles',
    this.pushCandles
  );

  Readable.call(this, {objectMode: true});

  this.get();
}

var Readable = require('stream').Readable;
Market.prototype = Object.create(Readable.prototype, {
  constructor: { value: Market }
});

Market.prototype._read = _.noop;

Market.prototype.pushCandles = function(candles) {
  _.each(candles, this.push);
}

Market.prototype.get = function() {
  this.fetcher.fetch();
}

Market.prototype.processTrades = function(trades) {
  if (!this.tradeBatcher) {
    log.error('TradeBatcher not initialized, cannot process trades');
    return;
  }

  this.tradeBatcher.write(trades);

  if(this.done) {
    log.info('Done importing!');
    this.emit('end');
    return;
  }

  if(_.size(trades) && gekkoEnv === 'child-process') {
    let lastAtTS = _.last(trades).date;
    let lastAt = moment.unix(lastAtTS).utc().format();
    process.send({event: 'marketUpdate', payload: lastAt});
  }

  setTimeout(this.get, 1000);
}

module.exports = Market;
