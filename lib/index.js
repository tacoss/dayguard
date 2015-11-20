var fs = require('fs-extra'),
    path = require('path');

function normalize(name, selector) {
  return [encodeURIComponent(selector), name.replace(/[^\w_-]+/g, '_')].join('@');
}

function guardFactory(client, options) {
  console.log('INIT', options);

  function getElementPosition() {
    var el = document.querySelector(arguments[0]),
        rect = el.getBoundingClientRect();

    // hide scrollbar for better diffs
    document.body.style.overflow = 'hidden';

    el.scrollIntoView();

    var data = {
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    for (var k in rect) {
      data[k] = rect[k];
    }

    return data;
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
        var filepath = path.join('screenshots', normalize(this.currentTest.name, selector));

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

        fs.outputFileSync(path.join(filepath, i + '.png'), image);
      });

    return client;
  };
}

module.exports.use = function(client, options) {
  if (typeof client.addScreenshot === 'function') {
    return client;
  }

  client.addScreenshot = guardFactory(client, options || {});

  return client;
};
