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

var action = function () {
  var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
    return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            console.error('\'exp convert\' is temporarily under maintenance and not available');
            console.error('The easiest way to convert a project at the moment is to create a new project with \'exp init\' and copy your project files into it.');
            return _context.abrupt('return');

          case 3:
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

var __unused_action = function () {
  var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectDir, options) {
    var warning, _ref3, confirmed, gitWarning, _ref4, gitConfirmed, questions, answers;

    return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            warning = [{
              type: 'confirm',
              name: 'confirmed',
              message: 'Warning: we are going to modify your package.json, delete your node_modules directory, and modify your .babelrc file (or create if you do not have one). Are you OK with this?\n'
            }];
            _context2.next = 3;
            return (_inquirer || _load_inquirer()).default.prompt(warning);

          case 3:
            _ref3 = _context2.sent;
            confirmed = _ref3.confirmed;

            if (confirmed) {
              _context2.next = 8;
              break;
            }

            (0, (_log || _load_log()).default)('OK, aborted. You can do this process manually by creating a new project with `exp init` and copying in the files that you need.');
            return _context2.abrupt('return');

          case 8:
            gitWarning = [{
              type: 'confirm',
              name: 'gitConfirmed',
              message: 'Have you committed any important changes to your project to git, so you can rollback if necessary?\n'
            }];
            _context2.next = 11;
            return (_inquirer || _load_inquirer()).default.prompt(gitWarning);

          case 11:
            _ref4 = _context2.sent;
            gitConfirmed = _ref4.gitConfirmed;


            if (!gitConfirmed) {
              (0, (_log || _load_log()).default)('Well I am glad that we asked! Commit your changes and run `exp convert` again when you are ready.');
            }

            if (!(!confirmed || !gitConfirmed)) {
              _context2.next = 16;
              break;
            }

            return _context2.abrupt('return');

          case 16:
            questions = [{
              type: 'input',
              name: 'projectName',
              message: 'What is your project name? eg: Instagram for Cats\n',
              validate: function validate(val) {
                return val.length > 0;
              }
            }, {
              type: 'input',
              name: 'projectDescription',
              message: 'Please provide a short description of your project (optional, used for your landing page, eg: Finally your cat can post selfies in a welcoming community of other cats, no dogs allowed)\n'
            }, {
              type: 'input',
              name: 'projectEntryPoint',
              message: 'Which file is the main entry point to your project? (if it is the standard index.android.js / index.ios.js, just press enter)\n'
            }];
            _context2.next = 19;
            return (_inquirer || _load_inquirer()).default.prompt(questions);

          case 19:
            answers = _context2.sent;
            _context2.next = 22;
            return (_xdl || _load_xdl()).Exp.convertProjectAsync(projectDir, answers, (_log || _load_log()).default);

          case 22:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function __unused_action(_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}();

var _inquirer;

function _load_inquirer() {
  return _inquirer = _interopRequireDefault(require('inquirer'));
}

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('convert [project-dir]').alias('onentize').description('Initialize Expo project files within an existing React Native project').allowNonInteractive().asyncActionProjectDir(action, true); // skip validation because the project dir isn't a valid exp dir yet
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/convert.js.map
