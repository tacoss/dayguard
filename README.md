[![NPM version](https://badge.fury.io/js/dayguard.png)](http://badge.fury.io/js/dayguard)

**Dayguard** is a "plugin" for [NightwatchJS](http://nightwatchjs.org/) that allows you to do CSS Regression tests.

It's based on [Resemble.js](https://www.npmjs.com/package/node-resemble-js) (for NodeJS) and [gm](https://www.npmjs.com/package/gm) for GraphicsMagick/ImageMagick support.

After initializing with `use()` you can chain `takeScreenshotFromElement()` and `compareScreenshotFromElement()` within your tests:

```javascript
module.exports = {
  'Initialize dayguard integration': function(browser) {
    // defaults
    var options = {
      gm: true, // disable GraphicsMagick and use ImageMagick instead
      ref: false, // always compare against solid references (_ref.png)
      path: 'screenshots' // relative from CWD or absolute from everywhere
    };

    require('dayguard').use(browser, options);
  },
  'Ensure .some-element is visually consistent': function(browser) {
    browser
    .takeScreenshotFromElement('.some-element')
    .compareScreenshotFromElement('.some-element', function(result, done) {
      var threshold = 1.33,
          expected = '<=' + threshold,
          actual = result.imageDiff.misMatchPercentage,
          msg = 'Screenshot for .some-element differ ' + actual + '%';

        if (parseFloat(actual) >= parseFloat(threshold)) {
          browser.fail(actual, expected, msg);
        } else {
          browser.ok(actual, expected, msg);
        }

        done();
    })
  }
};
```

## Why not use other tools?

Dayguard leverages on NightwatchJS (Webdriver &rarr; Selenium) so you can take screenshots from real browsers and not just headless ones.

> I've got really tired from trying other solutions (NightwatchCSS, PhantomJS, PhantomCSS, CasperJS, Grunt, Gulp, etc.) that relies on "toy" browsers exposing ugly APIs to enjoy.

Meh.
