var path = require('path');

var helpers = require('./helpers'),
    addFactory = helpers.addFactory,
    diffFactory = helpers.diffFactory;

var globals = {};

module.exports = function dayguard(feature, scenario) {
  if (scenario.dayguard || feature.dayguard) {
    var fixedPath = scenario.dayguard || feature.dayguard;

    dayguard.bind(this, {
      path: typeof fixedPath === 'string' ? fixedPath : undefined
    });
  } else {
    dayguard.unbind(this);
  }
};

module.exports.bind = function(client, options) {
  if (!options) {
    options = {};
  }

  options.gm = options.gm || globals.gm;
  options.ref = options.ref || globals.ref;
  options.path = options.path || globals.path || 'screenshots';
  options.cache = options.cache || globals.cache || {};

  client.takeScreenshotFromElement = addFactory(client, options);
  client.compareScreenshotFromElement = diffFactory(client, options);

  return client;
};

module.exports.unbind = function(client) {
  delete client.takeScreenshotFromElement;
  delete client.compareScreenshotFromElement;
};

module.exports.defaults = function(params) {
  for (var prop in params) {
    if (typeof params[prop] !== 'undefined') {
      globals[prop] = params[prop];
    }
  }
};

module.exports.configure = function(settings, argv) {
  // take some defaults from command line
  module.exports.defaults({
    gm: argv.gm,
    ref: argv.ref
  });

  settings.custom_assertions_path.push(path.join(__dirname, 'asserts'));
};
