import crayon from '@ccheever/crayon';

let _bundleProgressBar;

function respectProgressBars(commitLogs) {
  if (_bundleProgressBar) {
    _bundleProgressBar.terminate();
    _bundleProgressBar.lastDraw = '';
    commitLogs();
    _bundleProgressBar.render();
  } else {
    commitLogs();
  }
}

function log() {
  if (log.config.raw) {
    return;
  }
  var prefix = crayon.gray('[') + crayon.gray('exp') + crayon.gray(']');
  var args = [prefix].concat(Array.prototype.slice.call(arguments, 0));

  respectProgressBars(() => {
    console.log(...args);
  });
}

log.setBundleProgressBar = function setBundleProgressBar(bar) {
  _bundleProgressBar = bar;
};

log.error = function error() {
  if (log.config.raw) {
    return;
  }
  var prefix = crayon.red('[') + crayon.gray('exp') + crayon.red(']');
  var args = [prefix].concat(
    Array.prototype.slice.call(arguments, 0).map(x => crayon.red(x))
  );

  respectProgressBars(() => {
    console.error(...args);
  });
};

log.warn = function warn() {
  if (log.config.raw) {
    return;
  }
  var prefix = crayon.yellow('[') + crayon.gray('exp') + crayon.yellow(']');
  var args = [prefix].concat(
    Array.prototype.slice.call(arguments, 0).map(x => crayon.yellow(x))
  );

  respectProgressBars(() => {
    console.warn(...args);
  });
};

log.gray = function() {
  if (log.config.raw) {
    return;
  }
  var prefix = '[exp]';
  var args = [prefix].concat(Array.prototype.slice.call(arguments, 0));

  respectProgressBars(() => {
    crayon.gray.error(...args);
  });
};

log.raw = function(...args) {
  if (!log.config.raw) {
    return;
  }

  respectProgressBars(() => {
    console.log(...args);
  });
};

log.crayon = crayon;

log.config = {
  raw: false,
};

export default log;
