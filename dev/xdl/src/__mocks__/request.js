'use strict';

let extend = require('extend');

function asyncCallback(cb) {
  return function() {
    setImmediate(() => cb.apply(this, arguments));
  };
}

// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
  if (typeof options === 'function') {
    callback = options;
  }

  var params = {};
  if (typeof options === 'object') {
    extend(params, options, {uri});
  } else if (typeof uri === 'string') {
    extend(params, {uri});
  } else {
    extend(params, uri);
  }

  params.callback = callback || params.callback;
  return params;
}

function request(uri, options, callback) {
  if (typeof uri === 'undefined') {
    throw new Error('undefined is not a valid uri or options object.');
  }

  var params = initParams(uri, options, callback);
  callback = asyncCallback(params.callback);
  callback(null, currentResponse);
}

let currentResponse;
request.__setMockResponse = (object) => currentResponse = object;

module.exports = request;
