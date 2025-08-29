const _ = require('lodash');

const cache = require('../state/cache');
const Logger = require('../state/logger');
const apiKeyManager= cache.get('apiKeyManager');
const gekkoManager = cache.get('gekkos');
const security = require('../security');

const base = require('./baseConfig');

// starts an import
// requires a post body with a config object
module.exports = function *() {
  const mode = this.request.body.mode;

  let config = {};

  _.merge(config, base, this.request.body);

  // Validate and sanitize the configuration
  try {
    const { error, value } = security.configValidationSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      this.status = 400;
      this.body = {
        error: 'Invalid configuration',
        details: error.details.map(d => d.message)
      };
      return;
    }

    // Sanitize and convert types
    if (value.tradingAdvisor) {
      value.tradingAdvisor.candleSize = parseInt(value.tradingAdvisor.candleSize, 10);
      value.tradingAdvisor.historySize = parseInt(value.tradingAdvisor.historySize, 10);
    }

    config = value;
  } catch (err) {
    this.status = 500;
    this.body = { error: 'Internal validation error' };
    return;
  }

  // Attach API keys
  if(config.trader && config.trader.enabled && !config.trader.key) {

    const keys = apiKeyManager._getApiKeyPair(config.watch.exchange);

    if(!keys) {
      this.body = 'No API keys found for this exchange.';
      return;
    }

    _.merge(
      config.trader,
      keys
    );
  }

  const state = gekkoManager.add({config, mode});

  this.body = state;
}
