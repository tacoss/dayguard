'use strict';

const util = require('../helpers');

const resemble = require('node-resemble-js');
const fs = require('fs-extra');
const path = require('path');

function retrieveCache(client, selector, customName, readDirCallback) {
  const fixedSelector = util.normalize(selector);
  const fixedName = customName ? util.normalize(customName) : client.currentTest.module;
  const filepath = path.join(client.options.screenshotsPath, fixedName);
  const options = client.options.dayguard || {};
  let customFilePath = filepath;
  if (client.globals.customScreenshotsPath) {
    customFilePath = path.join(client.globals.customScreenshotsPath, fixedName);
  }
  const cache = util.cache(options, customFilePath, fixedSelector);
  if (cache && client.globals.customScreenshotsPath) {
    const b = cache.src.length - 1;
    const fileType = '.png'; // file extension
    let referenceFile = '';
    fs.readdir(path.join(customFilePath, fixedSelector), function (err, list) {
      if (err) throw err;
      for (let i = 0; i < list.length; i++) {
        if (path.extname(list[i]) === fileType) {
          referenceFile = list[i];
          const customCache = {
            latest: path.join(customFilePath, fixedSelector, referenceFile),
            current: path.join(filepath, fixedSelector, `ref.${b}.png`),
            filepathDiff: path.join(filepath, fixedSelector, 'diff.png'),
          };
          readDirCallback(customCache);
        }
      }
    });
  }

  if (cache && ((cache.src.length > 1) || options.ref)) {
    const a = options.ref ? '_ref' : (cache.src.length - 2);
    const b = cache.src.length - 1;

    return {
      latest: path.join(customFilePath, fixedSelector, `${options.ref ? a : (`ref.${a}`)}.png`),
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
  if (this.globals.customScreenshotsPath) {
    return this
      .perform((api, cb) => {
        function compareImage(cache) {
          if (!cache) {
            return done.call(this, { pending: 'Nothing to compare, skipping...' }, cb);
          }

          if (!fs.existsSync(cache.latest)) {
            throw new Error(`Missing latest reference ${cache.latest}`);
          }

          if (!fs.existsSync(cache.current)) {
            throw new Error(`Missing current reference ${cache.current}`);
          }
          resemble(cache.current)
            .compareTo(cache.latest)
            .onComplete(data => {
              done.call(this, {
                imageDiff: data,
              }, cb);
            });
        }
        retrieveCache(this, selector, customName, compareImage);
      });
  }
  return this
    .perform((api, cb) => {
      const diffImages = retrieveCache(this, selector, customName);

      if (!diffImages) {
        return done.call(this, { pending: 'Nothing to compare, skipping..' }, cb);
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
