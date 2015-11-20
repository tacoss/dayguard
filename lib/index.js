var fs = require('fs-extra'),
    path = require('path'),
    gm = require('gm'),
    resemble = require('node-resemble-js');

function normalize(name) {
  return name.replace(/[^\w_-]+/g, '_');
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

  function initializeCache(filepath, fixedName) {
    var cache = options.cache[fixedName] || {};

    var indexFile = path.join(filepath, 'index.json');

    if (!cache.src && fs.existsSync(indexFile)) {
      cache.src = fs.readJsonSync(indexFile);
    } else {
      cache.src = [];
    }

    if (!cache.add) {
      cache.filepath = filepath;

      options.cache[fixedName] = cache;

      cache.add = function(position, cb) {
        cache.src.push(position);
        fs.outputJson(indexFile, cache.src, cb);
      };
    }

    return cache;
  }

  function takeScreenshot(done, position, imageData, customName) {
    var fixedName = normalize(customName || client.currentTest.name);

    var loadImage = gm.subClass({ imageMagick: !options.gm });

    var filepath = path.join(options.path, fixedName);

    var image = new Buffer(imageData, 'base64');

    var indexedImages = initializeCache(filepath, fixedName);

    var imageChunk = path.join(filepath, indexedImages.src.length + '.png');

    fs.outputFileSync(imageChunk, image);

    var shot = loadImage(imageChunk).quality(100);

    shot.crop(position.width, position.height, position.left, position.top);

    shot.write(imageChunk, function(err) {
      if (err) {
        throw err;
      }

      indexedImages.add(position, done);
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
          takeScreenshot(cb, position, result.value, customName);
        });
      });

    return client;
  };
}

function diffFactory(client, options) {
  function retrieveCache(customName, fixedName) {
    var cache = options.cache[customName] || options.cache[fixedName];

    if (cache && ((cache.src.length > 1) || options.ref)) {
      var a = options.ref ? '_' : cache.src.length - 2,
          b = cache.src.length - 1;

      return {
        latest: path.join(cache.filepath, a + '.png'),
        current: path.join(cache.filepath, b + '.png'),
        filepathDiff: path.join(cache.filepath, a + '_' + b + '.png')
      };
    }
  }

  return function(selector, done) {
    if (!selector) {
      throw new TypeError('compareScreenshotFromElement() expects a selector');
    }

    if (typeof done !== 'function') {
      throw new TypeError('compareScreenshotFromElement() expects a valid callback');
    }

    var customName = normalize(selector),
        fixedName = normalize(this.currentTest.name);

    client
      .perform(function(api, cb) {
        var diffImages = retrieveCache(customName, fixedName);

        if (!diffImages) {
          return cb();
        }

        resemble(diffImages.current)
          .compareTo(diffImages.latest)
          .onComplete(function(data) {
            data.getDiffImage().pack()
              .pipe(fs.createWriteStream(diffImages.filepathDiff))
              .on('finish', function() {
                done.call(client, {
                  filepathDiff: diffImages.filepathDiff,
                  imageDiff: data
                }, cb);
              });
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
