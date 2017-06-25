'use strict';

const util = require('../helpers');

const resemble = require('node-resemble-js');
const fs = require('fs-extra');
const path = require('path');

function retrieveCache(client, selector, customName) {
  const fixedSelector = util.normalize(selector);
  const fixedName = customName ? util.normalize(customName) : client.currentTest.module;
  const filepath = path.join(client.options.screenshotsPath, fixedName);
  const options = client.options.dayguard || {};
  const cache = util.cache(options, filepath, fixedSelector);

  if (cache && ((cache.src.length > 1) || options.ref)) {
    const a = options.ref ? '_ref' : (cache.src.length - 2);
    const b = cache.src.length - 1;

    return {
      latest: path.join(filepath, fixedSelector, `${options.ref ? a : (`ref.${a}`)}.png`),
      current: path.join(filepath, fixedSelector, `ref.${b}.png`),
      filepathDiff: path.join(filepath, fixedSelector, `ref.${a}_${b}.png`),
    };
  }
}

module.exports.command = function compareScreenshotFromElement(selector, customName, done) {
  if (!this.options.screenshots) {
    throw new Error('Please enable screenshots to use this feature');
  }

  if (typeof customName === 'function') {
    done = customName;
    customName = null;
  }

  if (!selector) {
    throw new TypeError('compareScreenshotFromElement() expects a selector');
  }

  if (typeof done !== 'function') {
    throw new TypeError('compareScreenshotFromElement() expects a valid callback');
  }

  return this
    .perform((api, cb) => {
      const diffImages = retrieveCache(this, selector, customName);

      if (!diffImages) {
        return done.call(this, { pending: 'Nothing to compare, skipping...' }, cb);
      }

      if (!fs.existsSync(diffImages.latest)) {
        throw new Error(`Missing latest reference ${diffImages.latest}`);
      }

      if (!fs.existsSync(diffImages.current)) {
        throw new Error(`Missing current reference ${diffImages.current}`);
      }

      resemble(diffImages.current)
        .compareTo(diffImages.latest)
        .onComplete(data => {
          data.getDiffImage().pack()
            .pipe(fs.createWriteStream(diffImages.filepathDiff))
            .on('finish', () => {
              done.call(this, {
                filepathDiff: diffImages.filepathDiff,
                imageDiff: data,
              }, cb);
            });
        });
    });
};
