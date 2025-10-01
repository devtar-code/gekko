const cache = require('../state/cache');

module.exports = function(name) {
  return async function(ctx) {
    ctx.body = cache.get(name).list();
  }
}