'use strict';

const fs = require('fs-extra');
const path = require('path');

const CACHED = {};

function normalize(name) {
  return name.replace(/[^\w()._-]+/g, '_').replace(/\.+$|^\W+/g, '');
}

function cache(options, filepath, fixedName) {
  const indexFile = path.join(filepath, fixedName, 'index.json');
  const key = `${filepath}.${fixedName}`;

  if (!CACHED[key]) {
    CACHED[key] = {
      src: fs.existsSync(indexFile)
        ? fs.readJsonSync(indexFile)
        : [],

      add: (position, cb) => {
        CACHED[key].src.push(position);
        fs.outputJson(indexFile, CACHED[key].src, cb);
      },
    };
  }

  return CACHED[key];
}

module.exports = {
  normalize,
  cache,
};
