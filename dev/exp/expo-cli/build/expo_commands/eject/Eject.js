'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ejectAsync = undefined;

var _promise;

function _load_promise() {
  return _promise = _interopRequireDefault(require('babel-runtime/core-js/promise'));
}

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _stringify;

function _load_stringify() {
  return _stringify = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));
}

var _getIterator2;

function _load_getIterator() {
  return _getIterator2 = _interopRequireDefault(require('babel-runtime/core-js/get-iterator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var ejectAsync = exports.ejectAsync = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectRoot) {
    var filesWithExpo, usingExpo, expoSdkWarning, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, filename, reactNativeOptionMessage, questions, _ref2, ejectMethod, useYarn, npmOrYarn, configName, _ref3, exp, pkgJson, appJson, ejectCommand, ejectArgs, _spawn$sync, status, newDevDependencies, projectBabelPath, projectBabelRc, babelRcJson, lolThatsSomeComplexCode, args, stdio;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return filesUsingExpoSdk(projectRoot);

          case 2:
            filesWithExpo = _context.sent;
            usingExpo = filesWithExpo.length > 0;
            expoSdkWarning = void 0;

            if (!usingExpo) {
              _context.next = 29;
              break;
            }

            expoSdkWarning = (_chalk || _load_chalk()).default.bold('Warning!') + ' We found at least one file where your project imports the Expo SDK:\n';

            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context.prev = 10;
            for (_iterator = (0, (_getIterator2 || _load_getIterator()).default)(filesWithExpo); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              filename = _step.value;

              expoSdkWarning += '  ' + (_chalk || _load_chalk()).default.cyan(filename) + '\n';
            }

            _context.next = 18;
            break;

          case 14:
            _context.prev = 14;
            _context.t0 = _context['catch'](10);
            _didIteratorError = true;
            _iteratorError = _context.t0;

          case 18:
            _context.prev = 18;
            _context.prev = 19;

            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }

          case 21:
            _context.prev = 21;

            if (!_didIteratorError) {
              _context.next = 24;
              break;
            }

            throw _iteratorError;

          case 24:
            return _context.finish(21);

          case 25:
            return _context.finish(18);

          case 26:
            expoSdkWarning += '\n' + (_chalk || _load_chalk()).default.yellow.bold('If you choose the "plain" React Native option below, these imports will stop working.');
            _context.next = 30;
            break;

          case 29:
            expoSdkWarning = 'We didn\'t find any uses of the Expo SDK in your project, so you should be fine to eject to\n"Plain" React Native. (This check isn\'t very sophisticated, though.)';

          case 30:

            (0, (_log || _load_log()).default)('\n' + expoSdkWarning + '\nWe ' + (_chalk || _load_chalk()).default.italic('strongly') + ' recommend that you read this document before you proceed:\n  ' + (_chalk || _load_chalk()).default.cyan('https://github.com/react-community/create-react-native-app/blob/master/EJECTING.md') + '\nEjecting is permanent! Please be careful with your selection.\n');

            reactNativeOptionMessage = "React Native: I'd like a regular React Native project.";


            if (usingExpo) {
              reactNativeOptionMessage = (_chalk || _load_chalk()).default.italic("(WARNING: See above message for why this option may break your project's build)\n  ") + reactNativeOptionMessage;
            }

            questions = [{
              type: 'list',
              name: 'ejectMethod',
              message: 'How would you like to eject from create-react-native-app?',
              default: usingExpo ? 'expoKit' : 'raw',
              choices: [{
                name: reactNativeOptionMessage,
                value: 'raw'
              }, {
                name: "ExpoKit: I'll create or log in with an Expo account to use React Native and the Expo SDK.",
                value: 'expoKit'
              }, {
                name: "Cancel: I'll continue with my current project structure.",
                value: 'cancel'
              }]
            }];
            _context.next = 36;
            return (_inquirer || _load_inquirer()).default.prompt(questions);

          case 36:
            _ref2 = _context.sent;
            ejectMethod = _ref2.ejectMethod;

            if (!(ejectMethod === 'raw')) {
              _context.next = 114;
              break;
            }

            _context.next = 41;
            return (_fsExtra || _load_fsExtra()).default.exists(_path.default.resolve('yarn.lock'));

          case 41:
            useYarn = _context.sent;
            npmOrYarn = useYarn ? 'yarn' : 'npm';
            _context.next = 45;
            return (_xdl || _load_xdl()).ProjectUtils.configFilenameAsync(projectRoot);

          case 45:
            configName = _context.sent;
            _context.next = 48;
            return (_xdl || _load_xdl()).ProjectUtils.readConfigJsonAsync(projectRoot);

          case 48:
            _ref3 = _context.sent;
            exp = _ref3.exp;
            pkgJson = _ref3.pkg;

            if (exp) {
              _context.next = 53;
              break;
            }

            throw new Error('Couldn\'t read ' + configName);

          case 53:
            if (pkgJson) {
              _context.next = 55;
              break;
            }

            throw new Error('Couldn\'t read package.json');

          case 55:

            (0, (_log || _load_log()).default)("We have a couple of questions to ask you about how you'd like to name your app:");
            _context.next = 58;
            return (_inquirer || _load_inquirer()).default.prompt([{
              name: 'displayName',
              message: "What should your app appear as on a user's home screen?",
              default: exp.name,
              validate: function validate(s) {
                return s.length > 0;
              }
            }, {
              name: 'name',
              message: 'What should your Android Studio and Xcode projects be called?',
              default: pkgJson.name ? stripDashes(pkgJson.name) : undefined,
              validate: function validate(s) {
                return s.length > 0 && s.indexOf('-') === -1 && s.indexOf(' ') === -1;
              }
            }]);

          case 58:
            appJson = _context.sent;


            (0, (_log || _load_log()).default)('Writing your selections to app.json...');
            // write the updated app.json file
            _context.next = 62;
            return (_fsExtra || _load_fsExtra()).default.writeFile(_path.default.resolve('app.json'), (0, (_stringify || _load_stringify()).default)(appJson, null, 2));

          case 62:
            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Wrote to app.json, please update it manually in the future.'));

            ejectCommand = 'node';
            ejectArgs = [_path.default.resolve('node_modules', 'react-native', 'local-cli', 'cli.js'), 'eject'];
            _spawn$sync = (_crossSpawn || _load_crossSpawn()).default.sync(ejectCommand, ejectArgs, {
              stdio: 'inherit'
            }), status = _spawn$sync.status;


            if (status !== 0) {
              (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.red('Eject failed with exit code ' + status + ', see above output for any issues.'));
              (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.yellow('You may want to delete the `ios` and/or `android` directories.'));
              process.exit(1);
            } else {
              (0, (_log || _load_log()).default)('Successfully copied template native code.');
            }

            newDevDependencies = [];
            // Try to replace the Babel preset.

            _context.prev = 68;
            projectBabelPath = _path.default.resolve('.babelrc');
            // If .babelrc doesn't exist, the app is using the default config and
            // editing the config is not necessary.

            _context.next = 72;
            return (_fsExtra || _load_fsExtra()).default.exists(projectBabelPath);

          case 72:
            if (!_context.sent) {
              _context.next = 83;
              break;
            }

            _context.next = 75;
            return (_fsExtra || _load_fsExtra()).default.readFile(projectBabelPath);

          case 75:
            projectBabelRc = _context.sent.toString();


            // We assume the .babelrc is valid JSON. If we can't parse it (e.g. if
            // it's JSON5) the error is caught and a message asking to change it
            // manually gets printed.
            babelRcJson = JSON.parse(projectBabelRc);

            if (!(babelRcJson.presets && babelRcJson.presets.includes('babel-preset-expo'))) {
              _context.next = 83;
              break;
            }

            babelRcJson.presets = babelRcJson.presets.map(function (preset) {
              return preset === 'babel-preset-expo' ? 'babel-preset-react-native-stage-0/decorator-support' : preset;
            });
            _context.next = 81;
            return (_fsExtra || _load_fsExtra()).default.writeFile(projectBabelPath, (0, (_stringify || _load_stringify()).default)(babelRcJson, null, 2));

          case 81:
            newDevDependencies.push('babel-preset-react-native-stage-0');
            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Babel preset changed to `babel-preset-react-native-stage-0/decorator-support`.'));

          case 83:
            _context.next = 89;
            break;

          case 85:
            _context.prev = 85;
            _context.t1 = _context['catch'](68);

            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.yellow('We had an issue preparing your .babelrc for ejection.\nIf you have a .babelrc in your project, make sure to change the preset\nfrom `babel-preset-expo` to `babel-preset-react-native-stage-0/decorator-support`.'));
            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.red(_context.t1));

          case 89:

            delete pkgJson.main;

            // NOTE: expo won't work after performing a raw eject, so we should delete this
            // it will be a better error message for the module to not be found than for whatever problems
            // missing native modules will cause
            delete pkgJson.dependencies.expo;
            if (pkgJson.devDependencies) {
              delete pkgJson.devDependencies['react-native-scripts'];
              delete pkgJson.devDependencies['jest-expo'];
            }
            if (!pkgJson.scripts) {
              pkgJson.scripts = {};
            }
            pkgJson.scripts.start = 'react-native start';
            pkgJson.scripts.ios = 'react-native run-ios';
            pkgJson.scripts.android = 'react-native run-android';

            if (pkgJson.jest && pkgJson.jest.preset === 'jest-expo') {
              pkgJson.jest.preset = 'react-native';
              newDevDependencies.push('jest-react-native');
            } else if (pkgJson.jest) {
              (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.bold('Warning') + ': it looks like you\'ve changed the Jest preset from jest-expo to ' + pkgJson.jest.preset + '. We recommend you make sure this Jest preset is compatible with ejected apps.');
            }

            // no longer relevant to an ejected project (maybe build is?)
            delete pkgJson.scripts.eject;

            (0, (_log || _load_log()).default)('Updating your ' + npmOrYarn + ' scripts in package.json...');

            _context.next = 101;
            return (_fsExtra || _load_fsExtra()).default.writeFile(_path.default.resolve('package.json'), (0, (_stringify || _load_stringify()).default)(pkgJson, null, 2));

          case 101:

            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Your package.json is up to date!'));

            // Starting from react-native 0.49.x (SDK 22), react-native eject template includes this out of the box.

            if ((_xdl || _load_xdl()).Versions.gteSdkVersion(exp, '22.0.0')) {
              _context.next = 108;
              break;
            }

            (0, (_log || _load_log()).default)('Adding entry point...');
            lolThatsSomeComplexCode = 'import { AppRegistry } from \'react-native\';\nimport App from \'./App\';\nAppRegistry.registerComponent(\'' + appJson.name + '\', () => App);\n';
            _context.next = 107;
            return (_fsExtra || _load_fsExtra()).default.writeFile(_path.default.resolve('index.js'), lolThatsSomeComplexCode);

          case 107:
            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Added new entry points!'));

          case 108:

            (0, (_log || _load_log()).default)('\nNote that using `' + npmOrYarn + ' start` will now require you to run Xcode and/or\nAndroid Studio to build the native code for your project.');

            (0, (_log || _load_log()).default)('Removing node_modules...');
            (_rimraf || _load_rimraf()).default.sync(_path.default.resolve('node_modules'));
            if (useYarn) {
              (0, (_log || _load_log()).default)('Installing packages with yarn...');
              args = newDevDependencies.length > 0 ? ['add', '--dev'].concat(newDevDependencies) : [];

              (_crossSpawn || _load_crossSpawn()).default.sync('yarnpkg', args, { stdio: 'inherit' });
            } else {
              // npm prints the whole package tree to stdout unless we ignore it.
              stdio = [process.stdin, 'ignore', process.stderr];


              (0, (_log || _load_log()).default)('Installing existing packages with npm...');
              (_crossSpawn || _load_crossSpawn()).default.sync('npm', ['install'], { stdio: stdio });

              if (newDevDependencies.length > 0) {
                (0, (_log || _load_log()).default)('Installing new packages with npm...');
                (_crossSpawn || _load_crossSpawn()).default.sync('npm', ['install', '--save-dev'].concat(newDevDependencies), {
                  stdio: stdio
                });
              }
            }
            _context.next = 123;
            break;

          case 114:
            if (!(ejectMethod === 'expoKit')) {
              _context.next = 121;
              break;
            }

            _context.next = 117;
            return (0, (_accounts || _load_accounts()).loginOrRegisterIfLoggedOut)();

          case 117:
            _context.next = 119;
            return (_xdl || _load_xdl()).Detach.detachAsync(projectRoot);

          case 119:
            _context.next = 123;
            break;

          case 121:
            // we don't want to print the survey for cancellations
            (0, (_log || _load_log()).default)('OK! If you change your mind you can run this command again.');
            return _context.abrupt('return');

          case 123:

            (0, (_log || _load_log()).default)((_chalk || _load_chalk()).default.green('Ejected successfully!') + '\nPlease consider letting us know why you ejected in this survey:\n  ' + (_chalk || _load_chalk()).default.cyan('https://goo.gl/forms/iD6pl218r7fn9N0d2'));

          case 124:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[10, 14, 18, 26], [19,, 21, 25], [68, 85]]);
  }));

  return function ejectAsync(_x) {
    return _ref.apply(this, arguments);
  };
}();

var filesUsingExpoSdk = function () {
  var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectRoot) {
    var projectJsFiles, jsFileContents, filesUsingExpo, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _ref6, filename, contents, requires;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return findJavaScriptProjectFilesInRoot(projectRoot);

          case 2:
            projectJsFiles = _context2.sent;
            _context2.next = 5;
            return (_promise || _load_promise()).default.all(projectJsFiles.map(function (f) {
              return (_fsExtra || _load_fsExtra()).default.readFile(f);
            }));

          case 5:
            _context2.t0 = function (buf, i) {
              return {
                filename: projectJsFiles[i],
                contents: buf.toString()
              };
            };

            jsFileContents = _context2.sent.map(_context2.t0);
            filesUsingExpo = [];
            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            _context2.prev = 11;


            for (_iterator2 = (0, (_getIterator2 || _load_getIterator()).default)(jsFileContents); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              _ref6 = _step2.value;
              filename = _ref6.filename, contents = _ref6.contents;
              requires = (_matchRequire || _load_matchRequire()).default.findAll(contents);


              if (requires.includes('expo')) {
                filesUsingExpo.push(filename);
              }
            }

            _context2.next = 19;
            break;

          case 15:
            _context2.prev = 15;
            _context2.t1 = _context2['catch'](11);
            _didIteratorError2 = true;
            _iteratorError2 = _context2.t1;

          case 19:
            _context2.prev = 19;
            _context2.prev = 20;

            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }

          case 22:
            _context2.prev = 22;

            if (!_didIteratorError2) {
              _context2.next = 25;
              break;
            }

            throw _iteratorError2;

          case 25:
            return _context2.finish(22);

          case 26:
            return _context2.finish(19);

          case 27:
            filesUsingExpo.sort();

            return _context2.abrupt('return', filesUsingExpo);

          case 29:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[11, 15, 19, 27], [20,, 22, 26]]);
  }));

  return function filesUsingExpoSdk(_x2) {
    return _ref4.apply(this, arguments);
  };
}();

var findJavaScriptProjectFilesInRoot = function () {
  var _ref7 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3(root) {
    var stats, children, jsFilesInChildren;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!root.includes('node_modules')) {
              _context3.next = 2;
              break;
            }

            return _context3.abrupt('return', []);

          case 2:
            _context3.next = 4;
            return (_fsExtra || _load_fsExtra()).default.stat(root);

          case 4:
            stats = _context3.sent;

            if (!stats.isFile()) {
              _context3.next = 13;
              break;
            }

            if (!root.endsWith('.js')) {
              _context3.next = 10;
              break;
            }

            return _context3.abrupt('return', [root]);

          case 10:
            return _context3.abrupt('return', []);

          case 11:
            _context3.next = 24;
            break;

          case 13:
            if (!stats.isDirectory()) {
              _context3.next = 23;
              break;
            }

            _context3.next = 16;
            return (_fsExtra || _load_fsExtra()).default.readdir(root);

          case 16:
            children = _context3.sent;
            _context3.next = 19;
            return (_promise || _load_promise()).default.all(children.map(function (f) {
              return findJavaScriptProjectFilesInRoot(_path.default.join(root, f));
            }));

          case 19:
            jsFilesInChildren = _context3.sent;
            return _context3.abrupt('return', [].concat.apply([], jsFilesInChildren));

          case 23:
            return _context3.abrupt('return', []);

          case 24:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function findJavaScriptProjectFilesInRoot(_x3) {
    return _ref7.apply(this, arguments);
  };
}();

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _fsExtra;

function _load_fsExtra() {
  return _fsExtra = _interopRequireDefault(require('fs-extra'));
}

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _matchRequire;

function _load_matchRequire() {
  return _matchRequire = _interopRequireDefault(require('match-require'));
}

var _path = _interopRequireDefault(require('path'));

var _rimraf;

function _load_rimraf() {
  return _rimraf = _interopRequireDefault(require('rimraf'));
}

var _crossSpawn;

function _load_crossSpawn() {
  return _crossSpawn = _interopRequireDefault(require('cross-spawn'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../../log'));
}

var _accounts;

function _load_accounts() {
  return _accounts = require('../../accounts');
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function stripDashes(s) {
  var ret = '';

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = (0, (_getIterator2 || _load_getIterator()).default)(s), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var c = _step3.value;

      if (c !== ' ' && c !== '-') {
        ret += c;
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  return ret;
}
//# sourceMappingURL=../../__sourcemaps__/expo_commands/eject/Eject.js.map
