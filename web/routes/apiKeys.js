const cache = require('../state/cache');
const manager = cache.get('apiKeyManager');

module.exports = {
  get: async function(ctx) {
    ctx.body = manager.get();
  },
  add: async function(ctx) {
    const content = ctx.request.body;

    manager.add(content.exchange, content.values);

    ctx.body = {
      status: 'ok'
    };
  },
  remove: async function(ctx) {
    const exchange = ctx.request.body.exchange;

    manager.remove(exchange);

    ctx.body = {
      status: 'ok'
    };
  }
}