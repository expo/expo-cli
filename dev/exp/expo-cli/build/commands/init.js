'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2;

function _load_extends() {
  return _extends2 = _interopRequireDefault(require('babel-runtime/helpers/extends'));
}

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _asyncToGenerator2;

function _load_asyncToGenerator() {
  return _asyncToGenerator2 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));
}

var action = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
    var templateType, questions, insertPath, name, versions, templateIds, answers;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            templateType = void 0;
            questions = [];
            insertPath = _path.default.dirname(projectDir);
            name = _path.default.basename(projectDir);

            // If the user does not supply a project name, exp prompts the user

            if (projectDir === process.cwd()) {
              questions.push({
                name: 'name',
                message: 'Choose a project name:',
                validate: function validate(input) {
                  return (/^[a-z0-9@.' '\-\_]*$/i.test(input) && input.length > 0
                  );
                }
              });
            }

            if (!options.projectType) {
              _context.next = 9;
              break;
            }

            templateType = options.projectType;
            _context.next = 14;
            break;

          case 9:
            _context.next = 11;
            return (_xdl || _load_xdl()).Api.versionsAsync();

          case 11:
            versions = _context.sent;
            templateIds = (_lodash || _load_lodash()).default.map(versions.templatesv2, function (template) {
              return template.id;
            });


            questions.push({
              type: 'list',
              name: 'type',
              message: 'Choose a template type:',
              choices: templateIds
            });

          case 14:
            if (!(questions.length > 0)) {
              _context.next = 20;
              break;
            }

            _context.next = 17;
            return (_inquirer || _load_inquirer()).default.prompt(questions);

          case 17:
            answers = _context.sent;

            if (answers.name) {
              // If the user supplies a project name, change the insertPath and name
              insertPath = projectDir;
              name = answers.name;
            }
            if (answers.type) {
              templateType = answers.type;
            }

          case 20:
            if (!(!insertPath || !name)) {
              _context.next = 22;
              break;
            }

            throw new (_CommandError || _load_CommandError()).default('PATH_ERROR', 'Couldn\'t determine path for new project.');

          case 22:
            _context.next = 24;
            return downloadAndExtractTemplate(templateType, insertPath, {
              name: name
            });

          case 24:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function action(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

var downloadAndExtractTemplate = function () {
  var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(templateType, projectDir, validatedOptions) {
    var requestID, templateDownload, root;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _retryObject = { templateType: templateType, projectDir: projectDir, validatedOptions: validatedOptions };
            requestID = _currentRequestID + 1;

            _currentRequestID = requestID;

            _context2.next = 5;
            return (_xdl || _load_xdl()).Exp.downloadTemplateApp(templateType, projectDir, (0, (_extends2 || _load_extends()).default)({}, validatedOptions, {
              progressFunction: function progressFunction(progress) {
                if (_currentRequestID === requestID) {
                  (_xdl || _load_xdl()).Logger.notifications.info({ code: (_xdl || _load_xdl()).NotificationCode.DOWNLOAD_CLI_PROGRESS }, progress + '%');
                  if (!_downloadIsSlowPrompt) {
                    _bar.tick();
                  }
                }
              },
              retryFunction: function retryFunction() {
                triggerRetryPrompt();
              }
            }));

          case 5:
            templateDownload = _context2.sent;

            if (!(_currentRequestID !== requestID)) {
              _context2.next = 8;
              break;
            }

            return _context2.abrupt('return');

          case 8:
            _context2.next = 10;
            return (_xdl || _load_xdl()).Exp.extractTemplateApp(templateDownload.starterAppPath, templateDownload.name, templateDownload.root);

          case 10:
            root = _context2.sent;

            (0, (_log || _load_log()).default)('Your project is ready at ' + root + '. Use "exp start ' + root + '" to get started.');
            process.exit();

          case 13:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function downloadAndExtractTemplate(_x3, _x4, _x5) {
    return _ref2.apply(this, arguments);
  };
}();

var triggerRetryPrompt = function () {
  var _ref3 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee3() {
    var answer;
    return (_regenerator || _load_regenerator()).default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _downloadIsSlowPrompt = true;
            _context3.next = 3;
            return (_inquirer || _load_inquirer()).default.prompt({
              type: 'input',
              name: 'retry',
              message: '\n' + (_xdl || _load_xdl()).MessageCode.DOWNLOAD_IS_SLOW + '(y/n)',
              validate: function validate(val) {
                if (val !== 'y' && val !== 'n') {
                  return false;
                }
                return true;
              }
            });

          case 3:
            answer = _context3.sent;


            if (answer.retry === 'n') {
              _downloadIsSlowPrompt = false;
            } else {
              (_xdl || _load_xdl()).Exp.clearXDLCacheAsync();
              _downloadIsSlowPrompt = false;
              downloadAndExtractTemplate(_retryObject.templateType, _retryObject.projectDir, _retryObject.validatedOptions);
            }

          case 5:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function triggerRetryPrompt() {
    return _ref3.apply(this, arguments);
  };
}();

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _progress;

function _load_progress() {
  return _progress = _interopRequireDefault(require('progress'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _lodash;

function _load_lodash() {
  return _lodash = _interopRequireDefault(require('lodash'));
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

var _CommandError;

function _load_CommandError() {
  return _CommandError = _interopRequireDefault(require('../CommandError'));
}

var _path = _interopRequireDefault(require('path'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _currentRequestID = 0;
var _downloadIsSlowPrompt = false;
var _retryObject = {};
var _bar = new (_progress || _load_progress()).default('[:bar] :percent', {
  total: 100,
  complete: '=',
  incomplete: ' '
});

exports.default = function (program) {
  program.command('init [project-dir]').alias('i').description('Initializes a directory with an example project. Run it without any options and you will be prompted for the name and type.').option('-t, --projectType [type]', 'Specify what type of template to use. Run without this option to see all choices.').allowNonInteractive().asyncActionProjectDir(action, true /* skipProjectValidation */);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/init.js.map
