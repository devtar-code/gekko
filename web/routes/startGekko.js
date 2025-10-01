const _ = require('lodash');

const cache = require('../state/cache');
const Logger = require('../state/logger');
const apiKeyManager= cache.get('apiKeyManager');
const gekkoManager = cache.get('gekkos');
const security = require('../security');
const util = require('../../core/util');

const base = require('./baseConfig');

// starts an import
// requires a post body with a config object
module.exports = async function(ctx) {
  try {
    const mode = ctx.request.body.mode;

    if (!mode) {
      ctx.status = 400;
      ctx.body = { error: 'Mode is required' };
      return;
    }

    let config = {};

    // Merge base config first
    _.merge(config, base);
    
    // Then merge request body, but ensure tradingAdvisor is properly handled
    _.merge(config, ctx.request.body);
    
         // Ensure tradingAdvisor is properly configured if enabled
     if (ctx.request.body.tradingAdvisor && ctx.request.body.tradingAdvisor.enabled) {
      config.tradingAdvisor = {
        enabled: true,
        method: ctx.request.body.tradingAdvisor.method || 'MACD',
        candleSize: parseInt(ctx.request.body.tradingAdvisor.candleSize || 1, 10),
        historySize: parseInt(ctx.request.body.tradingAdvisor.historySize || 10, 10)
       };
       
               // For strategy runners, we need to ensure there's a market watcher first
        // Set market type to 'leech' for strategy runners so they get classified correctly
        // but don't try to leech immediately - let them run as standalone first
        config.market = {
          type: 'leech'
        };
       
       // Enable candleWriter for strategy runners so they can store data
       config.candleWriter = {
         enabled: true
       };
       
               // Add a delay to ensure market data is available before starting strategy
        // config.delay = 5000; // 5 second delay
       
       // Ensure strategy runners have proper adapter configuration
       if (!config.adapter) {
         config.adapter = 'sqlite';
       }
     } else {
       // For market watchers, ensure they have proper configuration
       config.tradingAdvisor = {
         enabled: false,
         candleSize: 1,
         historySize: 10
       };
       
       // Enable candleWriter for market watchers to store data for strategy runners
       config.candleWriter = {
         enabled: true
       };
       
       // Ensure market watchers have proper adapter configuration
       if (!config.adapter) {
         config.adapter = 'sqlite';
       }
     }

    // Validate and sanitize the configuration
    try {
      // Validate required fields
      if (!config.watch || !config.watch.exchange || !config.watch.asset || !config.watch.currency) {
        ctx.status = 400;
        ctx.body = { error: 'Invalid watch configuration. Exchange, asset, and currency are required.' };
        return;
      }

      // Sanitize and convert types
      if (config.tradingAdvisor) {
        if (config.tradingAdvisor.candleSize) {
          config.tradingAdvisor.candleSize = parseInt(config.tradingAdvisor.candleSize, 10);
          if (isNaN(config.tradingAdvisor.candleSize) || config.tradingAdvisor.candleSize <= 0) {
            ctx.status = 400;
            ctx.body = { error: 'Invalid candle size' };
            return;
          }
        }
        
        if (config.tradingAdvisor.historySize) {
          config.tradingAdvisor.historySize = parseInt(config.tradingAdvisor.historySize, 10);
          if (isNaN(config.tradingAdvisor.historySize) || config.tradingAdvisor.historySize <= 0) {
            this.status = 400;
            this.body = { error: 'Invalid history size' };
            return;
          }
        }
      }

      // Ensure paperTrader has default values if not provided
      if (config.paperTrader && config.paperTrader.enabled && !config.paperTrader.simulationBalance) {
        config.paperTrader.simulationBalance = {
          asset: 1,
          currency: 1000
        };
      }

      // Validate exchange
      const exchangeName = config.watch.exchange.toLowerCase();
      try {
        require(util.dirs().gekko + 'exchange/wrappers/' + exchangeName);
      } catch (err) {
        ctx.status = 400;
        ctx.body = { error: `Unsupported exchange: ${exchangeName}` };
        return;
      }

    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: 'Internal validation error: ' + err.message };
      return;
    }

    // Attach API keys if needed
    if(config.trader && config.trader.enabled && !config.trader.key) {
      const keys = apiKeyManager._getApiKeyPair(config.watch.exchange);

      if(!keys) {
        ctx.status = 400;
        ctx.body = { error: 'No API keys found for this exchange. Please configure API keys or enable paper trading.' };
        return;
      }

      _.merge(config.trader, keys);
    }

    // Add child to parent communication
    config.childToParent = {
      enabled: true
    };

    console.log(`Starting new Gekko with mode: ${mode}, exchange: ${config.watch.exchange}, pair: ${config.watch.asset}/${config.watch.currency}`);

    // If this is a strategy runner, ensure there's a market watcher first
    if (ctx.request.body.tradingAdvisor && ctx.request.body.tradingAdvisor.enabled) {
      // Check if there's already a market watcher for this exchange/pair
      const existingGekkos = gekkoManager.gekkos;
      const hasWatcher = Object.values(existingGekkos).some(gekko => 
        gekko.type === 'watcher' && 
        gekko.config.watch.exchange === config.watch.exchange &&
        gekko.config.watch.asset === config.watch.asset &&
        gekko.config.watch.currency === config.watch.currency
      );

      if (!hasWatcher) {
        console.log(`Creating market watcher for ${config.watch.exchange} ${config.watch.asset}/${config.watch.currency}`);
        
        // Create a market watcher config
        const watcherConfig = {
          ...config,
          tradingAdvisor: {
            enabled: false,
            candleSize: 1,
            historySize: 10
          },
          paperTrader: {
            enabled: false
          }
        };
        delete watcherConfig.market; // Remove leech configuration

        // Create the market watcher
        const watcherState = gekkoManager.add({config: watcherConfig, mode});
        console.log(`Market watcher created: ${watcherState.id}`);
      }
    }

    const state = gekkoManager.add({config, mode});

    if (!state || !state.id) {
      ctx.status = 500;
      ctx.body = { error: 'Failed to create Gekko instance' };
      return;
    }

    ctx.status = 200;
    ctx.body = state;
    
  } catch (error) {
    console.error('Error in startGekko:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error: ' + error.message };
  }
}
