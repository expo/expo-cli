'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise;

function _load_promise() {
  return _promise = _interopRequireDefault(require('babel-runtime/core-js/promise'));
}

var _getIterator2;

function _load_getIterator() {
  return _getIterator2 = _interopRequireDefault(require('babel-runtime/core-js/get-iterator'));
}

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var checkForUpdateAsync = function () {
  var _ref3 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3() {
    var _ref4, state, current, latest, message;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return (_update || _load_update()).default.checkForExpUpdateAsync();

          case 2:
            _ref4 = _context3.sent;
            state = _ref4.state;
            current = _ref4.current;
            latest = _ref4.latest;
            message = void 0;
            _context3.t0 = state;
            _context3.next = _context3.t0 === 'up-to-date' ? 10 : _context3.t0 === 'out-of-date' ? 11 : _context3.t0 === 'ahead-of-published' ? 14 : 15;
            break;

          case 10:
            return _context3.abrupt('break', 16);

          case 11:
            message = 'There is a new version of exp available (' + latest + ').\nYou are currently using exp ' + current + '\nRun `npm install -g exp` to get the latest version';
            (_log || _load_log()).default.error((_chalk || _load_chalk()).default.green(message));
            return _context3.abrupt('break', 16);

          case 14:
            return _context3.abrupt('break', 16);

          case 15:
            (_log || _load_log()).default.error('Confused about what version of exp you have?');

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function checkForUpdateAsync() {
    return _ref3.apply(this, arguments);
  };
}();

var writePathAsync = function () {
  var _ref5 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee4() {
    var subCommand;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            subCommand = process.argv[2];

            if (!(subCommand === 'prepare-detached-build')) {
              _context4.next = 3;
              break;
            }

            return _context4.abrupt('return');

          case 3:
            _context4.next = 5;
            return (_xdl || _load_xdl()).Binaries.writePathToUserSettingsAsync();

          case 5:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function writePathAsync() {
    return _ref5.apply(this, arguments);
  };
}();

// This is the entry point of the CLI


exports.run = run;

var _progress;

function _load_progress() {
  return _progress = _interopRequireDefault(require('progress'));
}

var _lodash;

function _load_lodash() {
  return _lodash = _interopRequireDefault(require('lodash'));
}

var _bunyan;

function _load_bunyan() {
  return _bunyan = _interopRequireDefault(require('@expo/bunyan'));
}

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _glob;

function _load_glob() {
  return _glob = _interopRequireDefault(require('glob'));
}

var _fs = _interopRequireDefault(require('fs'));

var _path = _interopRequireDefault(require('path'));

var _simpleSpinner;

function _load_simpleSpinner() {
  return _simpleSpinner = _interopRequireDefault(require('@expo/simple-spinner'));
}

var _url = _interopRequireDefault(require('url'));

var _commander;

function _load_commander() {
  return _commander = _interopRequireDefault(require('commander'));
}

var _commander2;

function _load_commander2() {
  return _commander2 = require('commander');
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _accounts;

function _load_accounts() {
  return _accounts = require('./accounts');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('./log'));
}

var _update;

function _load_update() {
  return _update = _interopRequireDefault(require('./update'));
}

var _urlOpts;

function _load_urlOpts() {
  return _urlOpts = _interopRequireDefault(require('./urlOpts'));
}

var _commonOptions;

function _load_commonOptions() {
  return _commonOptions = _interopRequireDefault(require('./commonOptions'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (process.env.NODE_ENV === 'development') {
  require('source-map-support').install();
}

// The following prototyped functions are not used here, but within in each file found in `./commands`
// Extending commander to easily add more options to certain command line arguments
(_commander2 || _load_commander2()).Command.prototype.urlOpts = function () {
  (_urlOpts || _load_urlOpts()).default.addOptions(this);
  return this;
};

(_commander2 || _load_commander2()).Command.prototype.allowOffline = function () {
  this.option('--offline', 'Allows this command to run while offline');
  return this;
};

(_commander2 || _load_commander2()).Command.prototype.allowNonInteractive = function () {
  this.option('--non-interactive', 'Fails if an interactive prompt would be required to continue.');
  return this;
};

// asyncAction is a wrapper for all commands/actions to be executed after commander is done
// parsing the command input
(_commander2 || _load_commander2()).Command.prototype.asyncAction = function (asyncFn, skipUpdateCheck) {
  var _this = this;

  (0, (_commonOptions || _load_commonOptions()).default)(this);
  return this.action(function () {
    var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var options;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (skipUpdateCheck) {
                _context.next = 8;
                break;
              }

              _context.prev = 1;
              _context.next = 4;
              return checkForUpdateAsync();

            case 4:
              _context.next = 8;
              break;

            case 6:
              _context.prev = 6;
              _context.t0 = _context['catch'](1);

            case 8:
              _context.prev = 8;
              options = (_lodash || _load_lodash()).default.last(args);

              if (options.output === 'raw') {
                (_log || _load_log()).default.config.raw = true;
              }
              if (options.offline) {
                (_xdl || _load_xdl()).Config.offline = true;
              }
              _context.next = 14;
              return asyncFn.apply(undefined, args);

            case 14:
              // After a command, flush the analytics queue so the program will not have any active timers
              // This allows node js to exit immediately
              (_xdl || _load_xdl()).Analytics.flush();
              _context.next = 21;
              break;

            case 17:
              _context.prev = 17;
              _context.t1 = _context['catch'](8);

              // TODO: Find better ways to consolidate error messages
              if (_context.t1._isCommandError) {
                (_log || _load_log()).default.error(_context.t1.message);
              } else if (_context.t1._isApiError) {
                (_log || _load_log()).default.error((_chalk || _load_chalk()).default.red(_context.t1.message));
              } else if (_context.t1.isXDLError) {
                (_log || _load_log()).default.error(_context.t1.message);
              } else {
                (_log || _load_log()).default.error(_context.t1.message);
                // TODO: Is there a better way to do this? EXPO_DEBUG needs to be set to view the stack trace
                if (process.env.EXPO_DEBUG) {
                  (_log || _load_log()).default.error((_chalk || _load_chalk()).default.gray(_context.t1.stack));
                } else {
                  (_log || _load_log()).default.error((_chalk || _load_chalk()).default.grey('Set EXPO_DEBUG=true in your env to view the stack trace.'));
                }
              }

              process.exit(1);

            case 21:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this, [[1, 6], [8, 17]]);
    }));

    return function () {
      return _ref.apply(this, arguments);
    };
  }());
};

// asyncActionProjectDir captures the projectDirectory from the command line,
// setting it to cwd if it is not provided.
// Commands such as `exp start` and `exp publish` use this.
// It does several things:
// - Everything in asyncAction
// - Checks if the user is logged in or out
// - Checks for updates
// - Attaches the bundling logger
// - Checks if the project directory is valid or not
// - Runs AsyncAction with the projectDir as an argument
(_commander2 || _load_commander2()).Command.prototype.asyncActionProjectDir = function (asyncFn, skipProjectValidation, skipAuthCheck) {
  var _this2 = this;

  return this.asyncAction(function () {
    var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectDir) {
      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      var opts, pathToConfig, logLines, logStackTrace, logWithLevel, bar, packagerLogsStream, status;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.prev = 0;
              _context2.next = 3;
              return checkForUpdateAsync();

            case 3:
              _context2.next = 7;
              break;

            case 5:
              _context2.prev = 5;
              _context2.t0 = _context2['catch'](0);

            case 7:
              opts = args[0];

              if (!(!skipAuthCheck && !opts.nonInteractive && !opts.offline)) {
                _context2.next = 11;
                break;
              }

              _context2.next = 11;
              return (0, (_accounts || _load_accounts()).loginOrRegisterIfLoggedOut)();

            case 11:
              if (skipAuthCheck) {
                _context2.next = 14;
                break;
              }

              _context2.next = 14;
              return (_xdl || _load_xdl()).User.ensureLoggedInAsync();

            case 14:

              if (!projectDir) {
                projectDir = process.cwd();
              } else {
                projectDir = _path.default.resolve(process.cwd(), projectDir);
              }

              if (!opts.config) {
                _context2.next = 20;
                break;
              }

              pathToConfig = _path.default.resolve(process.cwd(), opts.config);

              if (_fs.default.existsSync(pathToConfig)) {
                _context2.next = 19;
                break;
              }

              throw new Error('File at provide config path does not exist: ' + pathToConfig);

            case 19:
              (_xdl || _load_xdl()).ProjectUtils.setCustomConfigPath(projectDir, pathToConfig);

            case 20:
              logLines = function logLines(msg, logFn) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                  for (var _iterator = (0, (_getIterator2 || _load_getIterator()).default)(msg.split('\n')), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var line = _step.value;

                    logFn(line);
                  }
                } catch (err) {
                  _didIteratorError = true;
                  _iteratorError = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                      _iterator.return();
                    }
                  } finally {
                    if (_didIteratorError) {
                      throw _iteratorError;
                    }
                  }
                }
              };

              logStackTrace = function logStackTrace(chunk, logFn, nestedLogFn) {
                var traceInfo = void 0;
                try {
                  traceInfo = JSON.parse(chunk.msg);
                } catch (e) {
                  return logFn(chunk.msg);
                }

                var _traceInfo = traceInfo,
                    message = _traceInfo.message,
                    stack = _traceInfo.stack;

                (_log || _load_log()).default.addNewLineIfNone();
                logFn((_chalk || _load_chalk()).default.bold(message));

                var isLibraryFrame = function isLibraryFrame(line) {
                  return line.startsWith('node_modules');
                };

                var stackFrames = (_lodash || _load_lodash()).default.compact(stack.split('\n'));
                var lastAppCodeFrameIndex = (_lodash || _load_lodash()).default.findLastIndex(stackFrames, function (line) {
                  return !isLibraryFrame(line);
                });
                var lastFrameIndexToLog = Math.min(stackFrames.length - 1, lastAppCodeFrameIndex + 2 // show max two more frames after last app code frame
                );
                var unloggedFrames = stackFrames.length - lastFrameIndexToLog;

                // If we're only going to exclude one frame, just log them all
                if (unloggedFrames === 1) {
                  lastFrameIndexToLog = stackFrames.length - 1;
                  unloggedFrames = 0;
                }

                for (var i = 0; i <= lastFrameIndexToLog; i++) {
                  var line = stackFrames[i];
                  if (!line) {
                    continue;
                  } else if (line.match(/react-native\/.*YellowBox.js/)) {
                    continue;
                  }

                  if (line.startsWith('node_modules')) {
                    nestedLogFn('- ' + line);
                  } else {
                    nestedLogFn('* ' + line);
                  }
                }

                if (unloggedFrames > 0) {
                  nestedLogFn('- ... ' + unloggedFrames + ' more stack frames from framework internals');
                }

                (_log || _load_log()).default.printNewLineBeforeNextLog();
              };

              logWithLevel = function logWithLevel(chunk) {
                if (!chunk.msg) {
                  return;
                }
                if (chunk.level <= (_bunyan || _load_bunyan()).default.INFO) {
                  if (chunk.includesStack) {
                    logStackTrace(chunk, (_log || _load_log()).default, (_log || _load_log()).default.nested);
                  } else {
                    logLines(chunk.msg, (_log || _load_log()).default);
                  }
                } else if (chunk.level === (_bunyan || _load_bunyan()).default.WARN) {
                  if (chunk.includesStack) {
                    logStackTrace(chunk, (_log || _load_log()).default.warn, (_log || _load_log()).default.nestedWarn);
                  } else {
                    logLines(chunk.msg, (_log || _load_log()).default.warn);
                  }
                } else {
                  if (chunk.includesStack) {
                    logStackTrace(chunk, (_log || _load_log()).default.error, (_log || _load_log()).default.nestedError);
                  } else {
                    logLines(chunk.msg, (_log || _load_log()).default.error);
                  }
                }
              };

              bar = void 0;
              packagerLogsStream = new (_xdl || _load_xdl()).PackagerLogsStream({
                projectRoot: projectDir,
                onStartBuildBundle: function onStartBuildBundle() {
                  bar = new (_progress || _load_progress()).default('Building JavaScript bundle [:bar] :percent', {
                    total: 100,
                    clear: true,
                    complete: '=',
                    incomplete: ' '
                  });

                  (_log || _load_log()).default.setBundleProgressBar(bar);
                },
                onProgressBuildBundle: function onProgressBuildBundle(percent) {
                  if (!bar || bar.complete) return;
                  var ticks = percent - bar.curr;
                  ticks > 0 && bar.tick(ticks);
                },
                onFinishBuildBundle: function onFinishBuildBundle(err, startTime, endTime) {
                  if (bar && !bar.complete) {
                    bar.tick(100 - bar.curr);
                  }

                  if (bar) {
                    (_log || _load_log()).default.setBundleProgressBar(null);
                    bar = null;

                    if (err) {
                      (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.red('Failed building JavaScript bundle.'));
                    } else {
                      (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Finished building JavaScript bundle in ' + (endTime - startTime) + 'ms.'));
                    }
                  }
                },
                updateLogs: function updateLogs(updater) {
                  var newLogChunks = updater([]);
                  newLogChunks.forEach(function (newLogChunk) {
                    logWithLevel(newLogChunk);
                  });
                }
              });

              // needed for validation logging to function

              (_xdl || _load_xdl()).ProjectUtils.attachLoggerStream(projectDir, {
                stream: {
                  write: function write(chunk) {
                    if (chunk.tag === 'device') {
                      logWithLevel(chunk);
                    }
                  }
                },
                type: 'raw'
              });

              // The existing CLI modules only pass one argument to this function, so skipProjectValidation
              // will be undefined in most cases. we can explicitly pass a truthy value here to avoid
              // validation (eg for init)
              //
              // If the packager/manifest server is running and healthy, there is no need
              // to rerun Doctor because the directory was already checked previously
              // This is relevant for command such as `exp send`
              _context2.t1 = !skipProjectValidation;

              if (!_context2.t1) {
                _context2.next = 32;
                break;
              }

              _context2.next = 30;
              return (_xdl || _load_xdl()).Project.currentStatus(projectDir);

            case 30:
              _context2.t2 = _context2.sent;
              _context2.t1 = _context2.t2 !== 'running';

            case 32:
              if (!_context2.t1) {
                _context2.next = 42;
                break;
              }

              (0, (_log || _load_log()).default)('Making sure project is set up correctly...');
              (_simpleSpinner || _load_simpleSpinner()).default.start();
              // validate that this is a good projectDir before we try anything else

              _context2.next = 37;
              return (_xdl || _load_xdl()).Doctor.validateLowLatencyAsync(projectDir);

            case 37:
              status = _context2.sent;

              if (!(status === (_xdl || _load_xdl()).Doctor.FATAL)) {
                _context2.next = 40;
                break;
              }

              throw new Error('There is an error with your project. See above logs for information.');

            case 40:
              (_simpleSpinner || _load_simpleSpinner()).default.stop();
              (0, (_log || _load_log()).default)('Your project looks good!');

            case 42:
              return _context2.abrupt('return', asyncFn.apply(undefined, [projectDir].concat(args)));

            case 43:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, _this2, [[0, 5]]);
    }));

    return function (_x) {
      return _ref2.apply(this, arguments);
    };
  }(), true);
};

function runAsync() {
  try {
    // Setup analytics
    (_xdl || _load_xdl()).Analytics.setSegmentNodeKey('vGu92cdmVaggGA26s3lBX6Y5fILm8SQ7');
    (_xdl || _load_xdl()).Analytics.setVersionName(require('../package.json').version);
    _registerLogs();

    if (process.env.SERVER_URL) {
      var serverUrl = process.env.SERVER_URL;
      if (!serverUrl.startsWith('http')) {
        serverUrl = 'http://' + serverUrl;
      }
      var parsedUrl = _url.default.parse(serverUrl);
      (_xdl || _load_xdl()).Config.api.host = parsedUrl.hostname;
      (_xdl || _load_xdl()).Config.api.port = parsedUrl.port;
    }

    (_xdl || _load_xdl()).Config.developerTool = 'exp';

    // Setup our commander instance
    (_commander || _load_commander()).default.name = 'exp';
    (_commander || _load_commander()).default.version(require('../package.json').version).option('-o, --output [format]', 'Output format. pretty (default), raw');

    // Load each module found in ./commands by 'registering' it with our commander instance
    (_glob || _load_glob()).default.sync('commands/*.js', {
      cwd: __dirname
    }).forEach(function (file) {
      var commandModule = require('./' + file);
      if (typeof commandModule === 'function') {
        commandModule((_commander || _load_commander()).default);
      } else if (typeof commandModule.default === 'function') {
        commandModule.default((_commander || _load_commander()).default);
      } else {
        (_log || _load_log()).default.error('\'' + file + '.js\' is not a properly formatted command.');
      }
    });

    if (process.env.EXPO_DEBUG) {
      (_glob || _load_glob()).default.sync('debug_commands/*.js', {
        cwd: __dirname
      }).forEach(function (file) {
        require('./' + file)((_commander || _load_commander()).default);
      });
    }

    // Commander will now parse argv/argc
    (_commander || _load_commander()).default.parse(process.argv);

    // Display a message if the user does not input a valid command
    var subCommand = process.argv[2];
    if (subCommand) {
      var commands = [];
      (_commander || _load_commander()).default.commands.forEach(function (command) {
        commands.push(command['_name']);
        var alias = command['_alias'];
        if (alias) {
          commands.push(alias);
        }
      });
      if (!(_lodash || _load_lodash()).default.includes(commands, subCommand)) {
        console.log('"' + subCommand + '" is not an exp command. See "exp --help" for the full list of commands.');
      }
    } else {
      (_commander || _load_commander()).default.help();
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

function _registerLogs() {
  var stream = {
    stream: {
      write: function write(chunk) {
        if (chunk.code) {
          switch (chunk.code) {
            case (_xdl || _load_xdl()).NotificationCode.START_LOADING:
              (_simpleSpinner || _load_simpleSpinner()).default.start();
              return;
            case (_xdl || _load_xdl()).NotificationCode.STOP_LOADING:
              (_simpleSpinner || _load_simpleSpinner()).default.stop();
              return;
            case (_xdl || _load_xdl()).NotificationCode.DOWNLOAD_CLI_PROGRESS:
              return;
          }
        }

        if (chunk.level === (_bunyan || _load_bunyan()).default.INFO) {
          (0, (_log || _load_log()).default)(chunk.msg);
        } else if (chunk.level === (_bunyan || _load_bunyan()).default.WARN) {
          (_log || _load_log()).default.warn(chunk.msg);
        } else if (chunk.level >= (_bunyan || _load_bunyan()).default.ERROR) {
          (_log || _load_log()).default.error(chunk.msg);
        }
      }
    },
    type: 'raw'
  };

  (_xdl || _load_xdl()).Logger.notifications.addStream(stream);
  (_xdl || _load_xdl()).Logger.global.addStream(stream);
}

function run() {
  (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee5() {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return (_promise || _load_promise()).default.all([writePathAsync(), runAsync()]);

          case 2:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }))().catch(function (e) {
    console.error('Uncaught Error', e);
    process.exit(1);
  });
}
//# sourceMappingURL=__sourcemaps__/exp.js.map
