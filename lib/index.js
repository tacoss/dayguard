var fs = require('fs-extra'),
    path = require('path'),
    gm = require('gm');

function normalize(name, prefix) {
  return [prefix || '', name.replace(/[^\w_-]+/g, '_')].join('@');
}

function addFactory(client, options) {
  function getElementPosition() {
    var el = document.querySelector(arguments[0]),
        rect = el.getBoundingClientRect();

    // hide scrollbar for better diffs
    document.body.style.overflow = 'hidden';

    return {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      height: rect.height,
      width: rect.width,
      left: rect.left,
      top: rect.top
    };
  }

  return function(selector, customName) {
    var pos;

    if (!selector) {
      selector = 'body';
    }

    client
      .execute(getElementPosition, [selector], function(data) {
        pos = data.value;
      })
      .pause(200)
      .screenshot(true, function(result) {
        var fixedSelector = encodeURIComponent(selector),
            fixedName = customName ? normalize(customName) : normalize(this.currentTest.name, fixedSelector);

        var filepath = path.join(options.path, fixedName);

        var image = new Buffer(result.value, 'base64');

        var data = {
          selector: selector,
          position: pos,
          currentTest: {
            name: this.currentTest.name,
            group: this.currentTest.group,
            module: this.currentTest.module
          },
          desiredCapabilities: {
            platform: this.options.desiredCapabilities.platform,
            browserName: this.options.desiredCapabilities.browserName
          }
        };

        var indexFile = path.join(filepath, 'index.json'),
            indexedImages = [];

        if (fs.existsSync(indexFile)) {
          indexedImages = fs.readJsonSync(indexFile);
        }

        var i = indexedImages.length;

        indexedImages.push(data);

        fs.outputJsonSync(indexFile, indexedImages);

        var screenshotFile = path.join(filepath, fixedName + '.png');

        fs.outputFileSync(screenshotFile, image);

        var shot = gm(screenshotFile).quality(100);

        shot.crop(data.position.width, data.position.height, data.position.left, data.position.top);

        if (customName) {
          i = fixedSelector + '_' + i;
        }

        options.cache[fixedName] = data;

        shot.write(path.join(filepath, i + '.png'), function() {
          console.log('DONE');
        });
      });

    return client;
  };
}

function diffFactory(client, options) {
  return function(selector, threshold, screenshots) {
    var customName = normalize(selector),
        fixedName = normalize(this.currentTest.name, encodeURIComponent(selector));

    var data = options.cache[customName] || options.cache[fixedName];

    console.log('DIFF', data, options, threshold, screenshots);

    return client;
  };
}

module.exports.use = function(client, options) {
  if (!options) {
    options = {};
  }

  options.cache = options.cache || {};
  options.path = options.path || 'screenshots';

  client.addScreenshot = addFactory(client, options);
  client.diffScreenshot = diffFactory(client, options);

  return client;
};
