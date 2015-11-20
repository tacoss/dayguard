function guardFactory(client, options) {
  console.log('INIT', options);

  function getElementPosition() {
    var el = document.querySelector(arguments[0]),
        rect = el.getBoundingClientRect();

    // hide scrollbar for better diffs
    document.body.style.overflow = 'hidden';

    el.scrollIntoView();

    var data = {};

    for (var k in rect) {
      data[k] = rect[k];
    }

    return data;
  }

  return function(selector) {
    var node;

    if (!selector) {
      selector = 'body';
    }

    client
      .execute(getElementPosition, [selector], function(data) {
        node = data.value;
      })
      .pause(200)
      .saveScreenshot('generated/screenshots/test.png', function() {
        console.log('OK', selector, node);
      });

    return client;
  };
}

module.exports.use = function(client, options) {
  if (typeof client.guard === 'function') {
    return client;
  }

  client.guard = guardFactory(client, options || {});

  return client;
};
