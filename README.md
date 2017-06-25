[![NPM version](https://badge.fury.io/js/dayguard.png)](http://badge.fury.io/js/dayguard)

**Dayguard** is a "plugin" for [NightwatchJS](http://nightwatchjs.org/) that allows you to do CSS Regression tests.

It's based on [Resemble.js](https://www.npmjs.com/package/node-resemble-js) (for NodeJS) and [gm](https://www.npmjs.com/package/gm) for GraphicsMagick/ImageMagick support.

## API

- `visualChangesOf(selector, threshold)` &mdash; will call low-level commands and test for differences
- `takeScreenshotFromElement(selector, customName, timeout)` &mdash; takes a custom screenshot for the given selector
- `compareScreenshotFromElement(selector, customName, callback)` &mdash; compare the differences between the last references

## Example

Install the following dependencies:

```bash
$ npm install nwrun dayguard nightwatch chromedriver
```

Save the following script as `runner.js`:

```javascript
const chromedriver = require('chromedriver');
const dayguard = require('dayguard');
const nwrun = require('nwrun');
const path = require('path');

nwrun({
  standalone: true,
  src_folders: path.join(__dirname, 'tests'),
  output_folder: path.join(__dirname, 'reports'),
  custom_commands_path: [dayguard.custom_commands_path],
  custom_assertions_path: [dayguard.custom_assertions_path],
  selenium: {
    cli_args: {
      'webdriver.chrome.driver': chromedriver.path,
    },
  },
  test_settings: {
    default: {
      desiredCapabilities: {
        browserName: 'chrome',
      },
      screenshots: {
        enabled: true,
        path: path.join(__dirname, 'screenshots'),
      },
    },
  },
}, success => {
  if (!success) {
    process.exit(1);
  }
});
```

Save the following code as `tests/dayguard.js`:

```javascript
module.exports = {
  'Load an example page just for testing': browser => {
    browser
      .url('http://randomcolour.com/')
      .waitForElementVisible('body', 200);
  },
  'Take an screenshot and ask for differences': browser => {
    browser
      .assert.visualChangesOf('body')
      .end();
  },
};
```

Now just execute `node runner.js` and see your tests fail.

Why? Because each time you load randoumcolour.com you'll get a different color...

## How it works?

Each time `takeScreenshotFromElement()` gets called dayguard will do the following:

- Save the screenshot as `screenshots/<testName>/<selector>/ref.<offset|diff>.png`
- If there's no previous reference skip the next steps...
- Compare the most recent screenshot with the latest one:
  - Fail if the difference is not below the given thresdold
  - Continue othwerwise...

Every used selector will keep its saved positions as `screenshots/<testName>/<selector>/index.json` where each array-item will match the `<offset|diff>` pattern:

- `ref.0.png` &mdash; initial reference
- `ref.0_1.png` &mdash; difference between `0` and `1` refs
- `ref.1.png` &mdash; second reference
- etc.

Using this cache dayguard is able to effectively report any difference found.

## Why not use other tools?

Dayguard leverages on NightwatchJS (Webdriver &rarr; Selenium) so you can take screenshots from real browsers and not just headless ones.

> I've got really tired from trying other solutions (NightwatchCSS, PhantomJS, PhantomCSS, CasperJS, Grunt, Gulp, etc.) that relies on "toy" browsers exposing ugly APIs to enjoy.

Meh.
