'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.installExitHooks = installExitHooks;

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function installExitHooks(projectDir) {
  // install ctrl+c handler that writes non-running state to directory
  if (process.platform === 'win32') {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    }).on('SIGINT', function () {
      process.emit('SIGINT');
    });
  }

  process.on('SIGINT', function () {
    console.log((_chalk || _load_chalk()).default.blue('\nStopping packager...'));
    (_xdl || _load_xdl()).Project.stopAsync(projectDir).then(function () {
      console.log((_chalk || _load_chalk()).default.green('Packager stopped.'));
      process.exit();
    });
  });
}
//# sourceMappingURL=__sourcemaps__/exit.js.map
