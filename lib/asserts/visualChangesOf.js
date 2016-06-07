module.exports.assertion = function(selector, threshold) {
  if (!selector) {
    throw new TypeError('assert.visualChangesOf() expects a selector');
  }

  threshold = parseFloat(threshold || 1.33);

  this.message = 'Testing if element <' + selector + '> is under ' + threshold + '% of changes';
  this.expected = '< ' + threshold;

  this.pass = function(value) {
    return value < parseFloat(threshold);
  };

  this.value = function(result) {
    return parseFloat(result);
  };

  this.command = function(callback) {
    this.api
      .takeScreenshotFromElement(selector)
      .compareScreenshotFromElement(selector, function(result, done) {
        callback(result.imageDiff.misMatchPercentage);
        done();
      });

    return this;
  };
};
