var fs = require('fs-extra'),
    path = require('path'),
    gm = require('gm'),
    resemble = require('node-resemble-js');

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
      height: rect.height,
      width: rect.width,
      left: rect.left,
      top: rect.top
    };
  }

  function takeScreenshot(done, selector, position, imageData, customName) {
    var fixedSelector = encodeURIComponent(selector),
        fixedName = customName ? normalize(customName) : normalize(client.currentTest.name, fixedSelector);

    var filepath = path.join(options.path, fixedName);

    var image = new Buffer(imageData, 'base64');

    var data = {
      selector: selector,
      position: position
    };

    var indexFile = path.join(filepath, 'index.json'),
        indexedImages = options.cache[fixedName] || [];

    if (!indexedImages.length && fs.existsSync(indexFile)) {
      indexedImages = fs.readJsonSync(indexFile);
    }

    var screenshotFile = path.join(filepath, fixedName + '.png');

    fs.outputFileSync(screenshotFile, image);

    var shot = gm(screenshotFile).quality(100);

    shot.crop(data.position.width, data.position.height, data.position.left, data.position.top);

    var i = indexedImages.length;

    if (customName) {
      i = fixedSelector + '_' + i;
    }

    data.filepath = path.join(filepath, i + '.png');

    shot.write(data.filepath, function() {
      indexedImages.push(data);

      options.cache[fixedName] = indexedImages;

      fs.outputJson(indexFile, indexedImages, done);
    });
  }

  return function(selector, customName) {
    var position;

    if (!selector) {
      throw new TypeError('takeScreenshotFromElement() expects a selector');
    }

    client
      .execute(getElementPosition, [selector], function(data) {
        position = data.value;
      })
      .pause(options.timeout || 1000)
      .perform(function(api, cb) {
        api.screenshot(true, function(result) {
          takeScreenshot(cb, selector, position, result.value, customName);
        });
      });

    return client;
  };
}

function diffFactory(client, options) {
  return function(selector, done) {
    if (!selector) {
      throw new TypeError('compareScreenshotFromElement() expects a selector');
    }

    if (typeof done !== 'function') {
      throw new TypeError('compareScreenshotFromElement() expects a valid callback');
    }

    var customName = normalize(selector),
        fixedName = normalize(this.currentTest.name, encodeURIComponent(selector));

    client
      .perform(function(api, cb) {
        var indexedImages = options.cache[customName] || options.cache[fixedName];

        var diffImages = indexedImages.slice(-2),
            latestImage = diffImages.shift(),
            currentImage = diffImages.pop();

        if (!currentImage) {
          return cb();
        }

        resemble(currentImage.filepath)
          .compareTo(latestImage.filepath)
          .onComplete(function(data) {
            var x = indexedImages.length - 1;

            var filepath = path.dirname(currentImage.filepath);

            data.filepathDiff = path.join(filepath, (x - 1) + '_' + x + '.png');

            done.call(client, data, cb);
          });
      });

    return client;
  };
}

module.exports.use = function(client, options) {
  if (!options) {
    options = {};
  }

  options.cache = options.cache || {};
  options.path = options.path || 'screenshots';

  client.takeScreenshotFromElement = addFactory(client, options);
  client.compareScreenshotFromElement = diffFactory(client, options);

  return client;
};
