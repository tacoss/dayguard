var fs = require('fs-extra'),
    path = require('path'),
    gm = require('gm');

function normalize(name, selector) {
  return [encodeURIComponent(selector), name.replace(/[^\w_-]+/g, '_')].join('@');
}

function addFactory(client, options) {
  var screenshotsDir = options.path || 'screenshots';

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

  return function(selector) {
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
        var filepath = path.join(screenshotsDir, normalize(this.currentTest.name, selector));

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

        var screenshotFile = path.join(filepath, i + '.png');

        fs.outputFileSync(screenshotFile, image);

        var shot = gm(screenshotFile).quality(100);

        shot.crop(data.position.width, data.position.height, data.position.left, data.position.top);

        shot.write(screenshotFile, function() {
          console.log('DONE');
        });
      });

    return client;
  };
}

module.exports.use = function(client, options) {
  if (typeof client.addScreenshot === 'function') {
    return client;
  }

  client.addScreenshot = addFactory(client, options || {});

  return client;
};
