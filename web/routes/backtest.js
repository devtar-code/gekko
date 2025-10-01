// simple POST request that returns the backtest result

const _ = require('lodash');
const promisify = require('tiny-promisify');
const pipelineRunner = promisify(require('../../core/workers/pipeline/parent'));

// starts a backtest
// requires a post body like:
//
// {
//   gekkoConfig: {watch: {exchange: "poloniex", currency: "USDT", asset: "BTC"},…},…}
//   data: {
//     candleProps: ["close", "start"],
//     indicatorResults: true,
//     report: true,
//     roundtrips: true
//   }
// }
module.exports = async function(ctx) {
  var mode = 'backtest';

  var config = {};

  var base = require('./baseConfig');

  var req = ctx.request.body;

  _.merge(config, base, req);

  ctx.body = await pipelineRunner(mode, config);
}