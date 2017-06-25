'use strict';

const util = require('../helpers');

const fs = require('fs-extra');
const path = require('path');
const gm = require('gm');

function getElementPosition() {
  /* eslint-disable */
  var el = document.querySelector(arguments[0]);
  var rect = el.getBoundingClientRect();

  var ratio = window.devicePixelRatio || 1;

  // hide scrollbar for better diffs
  document.body.style.overflow = 'hidden';

  return {
    height: rect.height * ratio,
    width: rect.width * ratio,
    left: rect.left * ratio,
    top: rect.top * ratio
  };
  /* eslint-enable */
}

function takeScreenshot(done, client, selector, position, imageData, customName) {
  const fixedName = customName ? util.normalize(customName) : client.currentTest.module;
  const filepath = path.join(client.options.screenshotsPath, fixedName);
  const options = client.options.dayguard || {};

  let ref = path.join(filepath, '_ref.png');

  if (typeof options.ref === 'string') {
    ref = path.join(filepath, `${options.ref}.png`);
  }

  if (options.ref && !fs.existsSync(ref)) {
    throw new Error(`Missing reference ${ref}`);
  }

  const fixedSelector = util.normalize(selector);
  const loadImage = gm.subClass({ imageMagick: !options.gm });
  const indexedImages = util.cache(options, filepath, fixedSelector);
  const imageChunk = path.join(filepath, fixedSelector, `ref.${indexedImages.src.length}.png`);

  fs.outputFileSync(imageChunk, new Buffer(imageData, 'base64'));

  const shot = loadImage(imageChunk).quality(100);

  shot.crop(position.width, position.height, position.left, position.top);

  shot.write(imageChunk, err => {
    if (err) {
      throw err;
    }

    indexedImages.add(position, done);
  });
}

module.exports.command = function takeScreenshotFromElement(selector, customName, extraTimeout) {
  if (!this.options.screenshots) {
    throw new Error('Please enable screenshots to use this feature');
  }

  if (typeof customName === 'number') {
    extraTimeout = customName;
    customName = null;
  }

  if (!selector) {
    throw new TypeError('takeScreenshotFromElement() expects a selector');
  }

  let position;

  return this.execute(getElementPosition, [selector], data => {
    position = data.value;
  })
  .pause(extraTimeout || 100)
  .perform((api, cb) => {
    api.screenshot(false, result => {
      takeScreenshot(cb, this, selector, position, result.value, customName);
    });
  });
};

