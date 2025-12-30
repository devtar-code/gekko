// overwrite config with test-config

var utils = require(__dirname + '/../core/util');
var testConfig = require(__dirname + '/test-config.json');
utils.setConfig(testConfig);

// Lodash v3 compatibility for tests expecting _.first(array, n)
try {
  var _ = require('lodash');
  if(!_.first || _.first.length < 2) {
    // keep original
    var originalFirst = _.first || _.head;
    _.first = function(collection, n) {
      if(typeof n === 'number')
        return _.take(collection, n);
      return originalFirst ? originalFirst(collection) : _.head(collection);
    }
  }
} catch(e) {}