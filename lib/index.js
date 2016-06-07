var path = require('path');

var helpers = require('./helpers'),
    addFactory = helpers.addFactory,
    diffFactory = helpers.diffFactory;

var globals = {};

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
    globals[prop] = params[prop];
  }
};

module.exports.asserts_path = path.join(__dirname, 'asserts');
