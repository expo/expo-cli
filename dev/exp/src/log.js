import chalk from 'chalk';

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
  var prefix = chalk.gray('[') + chalk.gray('exp') + chalk.gray(']');
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
  var prefix = chalk.red('[') + chalk.gray('exp') + chalk.red(']');
  var args = [prefix].concat(
    Array.prototype.slice.call(arguments, 0).map(x => chalk.red(x))
  );

  respectProgressBars(() => {
    console.error(...args);
  });
};

log.warn = function warn() {
  if (log.config.raw) {
    return;
  }
  var prefix = chalk.yellow('[') + chalk.gray('exp') + chalk.yellow(']');
  var args = [prefix].concat(
    Array.prototype.slice.call(arguments, 0).map(x => chalk.yellow(x))
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
    console.error(chalk.gray(...args));
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

log.chalk = chalk;

log.config = {
  raw: false,
};

export default log;
