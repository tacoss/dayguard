'use strict';

module.exports.assertion = function visualChangesOf(selector, customName, threshold) {
  if (!selector) {
    throw new TypeError('assert.visualChangesOf() expects a selector');
  }

  if (typeof customName === 'number') {
    threshold = customName;
    customName = undefined;
  }

  threshold = parseFloat(threshold || 1.33);

  this.message = `Testing if element <${selector}> is under ${threshold}% of changes`;
  this.expected = `< ${threshold}`;

  this.pass = value => {
    return value < threshold;
  };

  this.value = result => {
    if (result.pending) {
      this.message = result.pending;
      return true;
    }

    return result.imageDiff.misMatchPercentage;
  };

  this.command = callback => {
    this.api
      .takeScreenshotFromElement(selector, customName)
      .compareScreenshotFromElement(selector, customName, (result, done) => {
        callback(result);
        done();
      });

    return this;
  };
};
