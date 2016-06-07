module.exports.assertion = function(selector, threshold) {
  if (!selector) {
    throw new TypeError('assert.visualChangesOf() expects a selector');
  }

  threshold = parseFloat(threshold || 1.33);

  this.message = 'Testing if element <' + selector + '> is under ' + threshold + '% of changes';
  this.expected = '< ' + threshold;

  this.pass = function(value) {
    if (typeof value !== 'number') {
      return value;
    }

    return value < parseFloat(threshold);
  };

  this.value = function(result) {
    if (result.pending) {
      this.message = result.pending;
      return true;
    }

    return result.imageDiff.misMatchPercentage;
  };

  this.command = function(callback) {
    this.api
      .takeScreenshotFromElement(selector)
      .compareScreenshotFromElement(selector, function(result, done) {
        callback(result);
        done();
      });

    return this;
  };
};
