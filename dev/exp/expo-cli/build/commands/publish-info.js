'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator;

function _load_regenerator() {
  return _regenerator = _interopRequireDefault(require('babel-runtime/regenerator'));
}

var _set;

function _load_set() {
  return _set = _interopRequireDefault(require('babel-runtime/core-js/set'));
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

var HORIZ_CELL_WIDTH_SMALL = 15;

var HORIZ_CELL_WIDTH_BIG = 40;
var VERSION = 2;

exports.default = function (program) {
  program.command('publish:history [project-dir]').alias('ph').description('View a log of your published releases.').option('-c, --release-channel <channel-name>', 'Filter by release channel. If this flag is not included, the most recent publications will be shown.').option('-count, --count <number-of-logs>', 'Number of logs to view, maximum 100, default 5.', parseInt).option('-p, --platform <ios|android>', 'Filter by platform, android or ios.').allowNonInteractive().asyncActionProjectDir(function () {
    var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
      var formData, result, sampleItem, generalTableString, headers, colWidths, bigCells, tableString;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (options.count && (isNaN(options.count) || options.count < 1 || options.count > 100)) {
                (_log || _load_log()).default.error('-n must be a number between 1 and 100 inclusive');
                process.exit(1);
              }

              // TODO(ville): move request from multipart/form-data to JSON once supported by the endpoint.
              formData = new (_xdl || _load_xdl()).FormData();

              formData.append('queryType', 'history');
              _context.t0 = formData;
              _context.next = 6;
              return (_xdl || _load_xdl()).Project.getSlugAsync(projectDir, options);

            case 6:
              _context.t1 = _context.sent;

              _context.t0.append.call(_context.t0, 'slug', _context.t1);

              formData.append('version', VERSION);
              if (options.releaseChannel) {
                formData.append('releaseChannel', options.releaseChannel);
              }
              if (options.count) {
                formData.append('count', options.count);
              }
              if (options.platform) {
                formData.append('platform', options.platform);
              }

              _context.next = 14;
              return (_xdl || _load_xdl()).Api.callMethodAsync('publishInfo', [], 'post', null, {
                formData: formData
              });

            case 14:
              result = _context.sent;


              if (result.queryResult && result.queryResult.length > 0) {
                // Print general publication info
                sampleItem = result.queryResult[0]; // get a sample item

                generalTableString = (_cliTable || _load_cliTable()).printTableJson({
                  fullName: sampleItem.fullName
                }, 'General Info');

                console.log(generalTableString);

                // Print info specific to each publication
                headers = ['publishedTime', 'appVersion', 'sdkVersion', 'platform', 'channel', 'channelId', 'publicationId'];

                // colWidths contains the cell size of each header

                colWidths = [];
                bigCells = new (_set || _load_set()).default(['publicationId', 'channelId', 'publishedTime']);

                headers.forEach(function (header) {
                  bigCells.has(header) ? colWidths.push(HORIZ_CELL_WIDTH_BIG) : colWidths.push(HORIZ_CELL_WIDTH_SMALL);
                });
                tableString = (_cliTable || _load_cliTable()).printTableJsonArray(headers, result.queryResult, colWidths);

                console.log(tableString);
              } else {
                (_log || _load_log()).default.error('No records found matching your query.');
              }

            case 16:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, undefined);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }());
  program.command('publish:details [project-dir]').alias('pd').description('View the details of a published release.').option('--publish-id <publish-id>', 'Publication id. (Required)').allowNonInteractive().asyncActionProjectDir(function () {
    var _ref2 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectDir, options) {
      var formData, result, queryResult, manifest, generalTableString, manifestTableString;
      return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              if (!options.publishId) {
                (_log || _load_log()).default.error('publishId must be specified.');
                process.exit(1);
              }

              formData = new (_xdl || _load_xdl()).FormData();

              formData.append('queryType', 'details');
              formData.append('publishId', options.publishId);
              _context2.t0 = formData;
              _context2.next = 7;
              return (_xdl || _load_xdl()).Project.getSlugAsync(projectDir, options);

            case 7:
              _context2.t1 = _context2.sent;

              _context2.t0.append.call(_context2.t0, 'slug', _context2.t1);

              _context2.next = 11;
              return (_xdl || _load_xdl()).Api.callMethodAsync('publishInfo', null, 'post', null, {
                formData: formData
              });

            case 11:
              result = _context2.sent;


              if (result.queryResult) {
                queryResult = result.queryResult;
                manifest = queryResult.manifest;

                delete queryResult.manifest;

                // Print general release info
                generalTableString = (_cliTable || _load_cliTable()).printTableJson(queryResult, 'Release Description');

                console.log(generalTableString);

                // Print manifest info
                manifestTableString = (_cliTable || _load_cliTable()).printTableJson(manifest, 'Manifest Details');

                console.log(manifestTableString);
              } else {
                (_log || _load_log()).default.error('No records found matching your query.');
              }

            case 13:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, undefined);
    }));

    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/publish-info.js.map
