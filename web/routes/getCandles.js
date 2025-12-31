// simple POST request that returns the candles requested

// expects a config like:

// let config = {
//   watch: {
//     exchange: 'poloniex',
//     currency: 'USDT',
//     asset: 'BTC'
//   },
//   daterange: {
//     from: '2016-05-22 11:22',
//     to: '2016-06-03 19:56'
//   },
//   adapter: 'sqlite',
//   sqlite: {
//     path: 'plugins/sqlite',

//     dataDirectory: 'history',
//     version: 0.1,

//     dependencies: [{
//       module: 'sqlite3',
//       version: '3.1.4'
//     }]
//   },
//   candleSize: 100
// }

const _ = require('lodash');
const moment = require('moment');
const promisify = require('tiny-promisify');
const candleLoader = promisify(require('../../core/workers/loadCandles/parent'));
const base = require('./baseConfig');

// Very small in-memory cache to avoid reloading the same candle range repeatedly.
// This is process-local and intentionally simple (no external deps).
const CACHE_TTL_MS = 15 * 1000; // 15s
const MAX_CACHE_ENTRIES = 50;
const candleCache = new Map(); // key -> { expiresAt, value }

const getCache = key => {
  const hit = candleCache.get(key);
  if (!hit) return;
  if (Date.now() > hit.expiresAt) {
    candleCache.delete(key);
    return;
  }
  return hit.value;
};

const setCache = (key, value) => {
  // naive eviction (oldest insertion order)
  if (candleCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = candleCache.keys().next().value;
    if (firstKey) candleCache.delete(firstKey);
  }
  candleCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
};

module.exports = async function(ctx) {

  // Avoid leaking globals
  let config = {};
  _.merge(config, base, ctx.request.body);

  // Basic validation & guardrails (protect server + DB from huge requests)
  const dr = config.daterange || (config.getCandles && config.getCandles.daterange);
  if (!dr || !dr.from || !dr.to) {
    ctx.status = 400;
    ctx.body = { error: 'Missing daterange (from/to)' };
    return;
  }

  const from = moment.utc(dr.from).startOf('minute');
  const to = moment.utc(dr.to).startOf('minute');
  if (!from.isValid() || !to.isValid() || to <= from) {
    ctx.status = 400;
    ctx.body = { error: 'Invalid daterange' };
    return;
  }

  const candleSize = Number(config.candleSize || config.tradingAdvisor?.candleSize || 1);
  if (!Number.isFinite(candleSize) || candleSize <= 0) {
    ctx.status = 400;
    ctx.body = { error: 'Invalid candleSize' };
    return;
  }

  // Cap the number of returned candles to prevent memory explosions.
  // Estimated candles = minutes / candleSize.
  const minutes = to.diff(from, 'minutes');
  const estimatedCandles = Math.ceil(minutes / candleSize);
  const MAX_RETURNED_CANDLES = 20000;
  if (estimatedCandles > MAX_RETURNED_CANDLES) {
    ctx.status = 413;
    ctx.body = {
      error: 'Requested daterange too large',
      details: `Estimated ${estimatedCandles} candles > limit ${MAX_RETURNED_CANDLES}. Reduce daterange or increase candleSize.`
    };
    return;
  }

  // Normalize daterange in config (candleLoader reads config.daterange via util.getConfig in child process)
  config.daterange = { from: from.format('YYYY-MM-DD HH:mm'), to: to.format('YYYY-MM-DD HH:mm') };
  config.candleSize = candleSize;
  if (!config.adapter) config.adapter = 'sqlite';

  const cacheKey = JSON.stringify({
    w: config.watch,
    dr: config.daterange,
    cs: config.candleSize,
    a: config.adapter
  });

  const cached = getCache(cacheKey);
  if (cached) {
    ctx.body = cached;
    return;
  }

  const candles = await candleLoader(config);
  setCache(cacheKey, candles);
  ctx.body = candles;
}