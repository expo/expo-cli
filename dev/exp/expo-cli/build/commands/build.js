'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var _BaseBuilder;

function _load_BaseBuilder() {
  return _BaseBuilder = _interopRequireDefault(require('./build/BaseBuilder'));
}

var _IOSBuilder;

function _load_IOSBuilder() {
  return _IOSBuilder = _interopRequireDefault(require('./build/IOSBuilder'));
}

var _AndroidBuilder;

function _load_AndroidBuilder() {
  return _AndroidBuilder = _interopRequireDefault(require('./build/AndroidBuilder'));
}

var _BuildError;

function _load_BuildError() {
  return _BuildError = _interopRequireDefault(require('./build/BuildError'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('build:ios [project-dir]').alias('bi').option('-c, --clear-credentials', 'Clear stored credentials.').option('-t --type <build>', 'Type of build: [archive|simulator].', /^(archive|simulator)$/i).option('-f, --local-auth', 'Turn on local auth flow').option('--expert-auth', "Don't log in to Apple, provide all of the files needed to build.").option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default').option('--publish', 'Publish the project before building.').description('Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.').allowNonInteractive().asyncActionProjectDir(function (projectDir, options) {
    if (options.localAuth || options.expertAuth) {
      (_log || _load_log()).default.warn('DEPRECATED: --local-auth and --expert-auth are no-ops now, will be removed in future');
    }
    var channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
    if (!channelRe.test(options.releaseChannel)) {
      (_log || _load_log()).default.error('Release channel name can only contain lowercase letters, numbers and special characters . _ and -');
      process.exit(1);
    }
    if (options.type !== undefined && options.type !== 'archive' && options.type !== 'simulator') {
      (_log || _load_log()).default.error('Build type must be one of {archive, simulator}');
      process.exit(1);
    }
    var iosBuilder = new (_IOSBuilder || _load_IOSBuilder()).default(projectDir, options);
    return iosBuilder.command();
  });

  program.command('build:android [project-dir]').alias('ba').option('-c, --clear-credentials', 'Clear stored credentials.').option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default').option('--publish', 'Publish the project before building.').description('Build a standalone APK for your project, signed and ready for submission to the Google Play Store.').allowNonInteractive().asyncActionProjectDir(function (projectDir, options) {
    var channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
    if (!channelRe.test(options.releaseChannel)) {
      (_log || _load_log()).default.error('Release channel name can only contain lowercase letters, numbers and special characters . _ and -');
      process.exit(1);
    }
    var androidBuilder = new (_AndroidBuilder || _load_AndroidBuilder()).default(projectDir, options);
    return androidBuilder.command();
  });

  program.command('build:status [project-dir]').alias('bs').description('Gets the status of a current (or most recently finished) build for your project.').allowNonInteractive().asyncActionProjectDir(function () {
    var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
      var builder;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              builder = new (_BaseBuilder || _load_BaseBuilder()).default(projectDir, options);
              _context.prev = 1;
              _context.next = 4;
              return builder.checkStatus(false);

            case 4:
              return _context.abrupt('return', _context.sent);

            case 7:
              _context.prev = 7;
              _context.t0 = _context['catch'](1);

              if (!(_context.t0 instanceof (_BuildError || _load_BuildError()).default)) {
                _context.next = 11;
                break;
              }

              return _context.abrupt('return');

            case 11:
              throw _context.t0;

            case 12:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, undefined, [[1, 7]]);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/build.js.map
