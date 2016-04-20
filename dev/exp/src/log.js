var crayon = require('@ccheever/crayon');

function log() {
  if (log.config.raw) {
    return;
  }
  var prefix = crayon.gray("[") + crayon.gray('exp') + crayon.gray("]");
  var args = [prefix].concat(Array.prototype.slice.call(arguments, 0));
  console.error.apply(console, args);
}

log.error = function error() {
  if (log.config.raw) {
    return;
  }
  var prefix = crayon.red("[") + crayon.gray('exp') + crayon.red("]") + crayon.red.bold(" Error:");
  var args = [prefix].concat(Array.prototype.slice.call(arguments, 0).map((x) => crayon.red(x)));
  console.error.apply(console, args);
};

log.warn = function warn() {
  if (log.config.raw) {
    return;
  }
  var prefix = crayon.yellow('[') + crayon.gray('exp') + crayon.yellow(']');
  var args = [prefix].concat(Array.prototype.slice.call(arguments, 0).map((x) => crayon.yellow(x)));
  console.warn.apply(console, args);
}

log.gray = function() {
  if (log.config.raw) {
    return;
  }
  var prefix = '[exp]';
  var args = [prefix].concat(Array.prototype.slice.call(arguments, 0));
  crayon.gray.error.apply(crayon, args);
}

log.raw = function (...args) {
  if (!log.config.raw) {
    return;
  }
  console.log(...args);
}

log.crayon = crayon;

log.config = {
  raw: false,
};

module.exports = log;
