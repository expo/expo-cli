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

var _xdl;

function _load_xdl() {
  return _xdl = require('xdl');
}

var _log;

function _load_log() {
  return _log = _interopRequireDefault(require('../log'));
}

var _cliTable;

function _load_cliTable() {
  return _cliTable = _interopRequireWildcard(require('../commands/utils/cli-table'));
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (program) {
  program.command('publish:set [project-dir]').alias('ps').description('Set a published release to be served from a specified channel.').option('-c, --release-channel <channel-name>', 'The channel to set the published release. (Required)').option('-p, --publish-id <publish-id>', 'The id of the published release to serve from the channel. (Required)').allowNonInteractive().asyncActionProjectDir(function () {
    var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
      var user, api, result, tableString;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!options.releaseChannel) {
                (_log || _load_log()).default.error('You must specify a release channel.');
              }
              if (!options.publishId) {
                (_log || _load_log()).default.error('You must specify a publish id. You can find ids using publish:history.');
              }
              _context.next = 4;
              return (_xdl || _load_xdl()).User.getCurrentUserAsync();

            case 4:
              user = _context.sent;
              api = (_xdl || _load_xdl()).ApiV2.clientForUser(user);
              _context.prev = 6;
              _context.t0 = api;
              _context.t1 = options.releaseChannel;
              _context.t2 = options.publishId;
              _context.next = 12;
              return (_xdl || _load_xdl()).Project.getSlugAsync(projectDir, options);

            case 12:
              _context.t3 = _context.sent;
              _context.t4 = {
                releaseChannel: _context.t1,
                publishId: _context.t2,
                slug: _context.t3
              };
              _context.next = 16;
              return _context.t0.postAsync.call(_context.t0, 'publish/set', _context.t4);

            case 16:
              result = _context.sent;
              tableString = (_cliTable || _load_cliTable()).printTableJson(result.queryResult, 'Channel Set Status ', 'SUCCESS');

              console.log(tableString);
              _context.next = 24;
              break;

            case 21:
              _context.prev = 21;
              _context.t5 = _context['catch'](6);

              (_log || _load_log()).default.error(_context.t5);

            case 24:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, undefined, [[6, 21]]);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());
  program.command('publish:rollback [project-dir]').alias('pr').description('Rollback an update to a channel.').option('--channel-id <channel-id>', 'The channel id to rollback in the channel. (Required)').allowNonInteractive().asyncActionProjectDir(function () {
    var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectDir, options) {
      var user, api, result, tableString;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!options.channelId) {
                (_log || _load_log()).default.error('You must specify a channel id. You can find ids using publish:history.');
              }
              _context2.next = 3;
              return (_xdl || _load_xdl()).User.getCurrentUserAsync();

            case 3:
              user = _context2.sent;
              api = (_xdl || _load_xdl()).ApiV2.clientForUser(user);
              _context2.prev = 5;
              _context2.t0 = api;
              _context2.t1 = options.channelId;
              _context2.next = 10;
              return (_xdl || _load_xdl()).Project.getSlugAsync(projectDir, options);

            case 10:
              _context2.t2 = _context2.sent;
              _context2.t3 = {
                channelId: _context2.t1,
                slug: _context2.t2
              };
              _context2.next = 14;
              return _context2.t0.postAsync.call(_context2.t0, 'publish/rollback', _context2.t3);

            case 14:
              result = _context2.sent;
              tableString = (_cliTable || _load_cliTable()).printTableJson(result.queryResult, 'Channel Rollback Status ', 'SUCCESS');

              console.log(tableString);
              _context2.next = 22;
              break;

            case 19:
              _context2.prev = 19;
              _context2.t4 = _context2['catch'](5);

              (_log || _load_log()).default.error(_context2.t4);

            case 22:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, undefined, [[5, 19]]);
    }));

    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/publish-modify.js.map
