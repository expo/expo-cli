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

var _chalk;

function _load_chalk() {
  return _chalk = _interopRequireDefault(require('chalk'));
}

var _fs = _interopRequireDefault(require('fs'));

var _path = _interopRequireDefault(require('path'));

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
  program.command('fetch:ios:certs [project-dir]').description("Fetch this project's iOS certificates. Writes to PROJECT_DIR/PROJECT_NAME_(dist|push).p12 and prints passwords to stdout.").asyncActionProjectDir(function () {
    var _ref = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee(projectDir, options) {
      var _ref2, _ref2$args, username, remotePackageName, experienceName, distOutputFile, pushOutputFile, credentialMetadata, _ref3, certP12, certPassword, certPrivateSigningKey, pushP12, pushPassword, pushPrivateSigningKey, provisioningProfile, teamId, keyPath, _keyPath, p;

      return (_regenerator || _load_regenerator()).default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return (_xdl || _load_xdl()).Exp.getPublishInfoAsync(projectDir);

            case 2:
              _ref2 = _context.sent;
              _ref2$args = _ref2.args;
              username = _ref2$args.username;
              remotePackageName = _ref2$args.remotePackageName;
              experienceName = _ref2$args.remoteFullPackageName;
              distOutputFile = _path.default.resolve(projectDir, remotePackageName + '_dist.p12');
              pushOutputFile = _path.default.resolve(projectDir, remotePackageName + '_push.p12');
              credentialMetadata = {
                username: username,
                experienceName: experienceName,
                platform: 'ios'
              };


              (0, (_log || _load_log()).default)('Retreiving iOS credentials for ' + experienceName);

              _context.prev = 11;
              _context.next = 14;
              return (_xdl || _load_xdl()).Credentials.getCredentialsForPlatform(credentialMetadata);

            case 14:
              _ref3 = _context.sent;
              certP12 = _ref3.certP12;
              certPassword = _ref3.certPassword;
              certPrivateSigningKey = _ref3.certPrivateSigningKey;
              pushP12 = _ref3.pushP12;
              pushPassword = _ref3.pushPassword;
              pushPrivateSigningKey = _ref3.pushPrivateSigningKey;
              provisioningProfile = _ref3.provisioningProfile;
              teamId = _ref3.teamId;

              // if undefines because some people might have pre-local-auth as default credentials.
              if (teamId !== undefined) {
                (0, (_log || _load_log()).default)('These credentials are associated with Apple Team ID: ' + teamId);
              }
              (0, (_log || _load_log()).default)('Writing distribution cert to ' + distOutputFile + '...');
              _fs.default.writeFileSync(distOutputFile, Buffer.from(certP12, 'base64'));
              if (certPrivateSigningKey !== undefined) {
                keyPath = _path.default.resolve(projectDir, remotePackageName + '_dist_cert_private.key');

                _fs.default.writeFileSync(keyPath, certPrivateSigningKey);
              }
              (0, (_log || _load_log()).default)('Done writing distribution cert credentials to disk.');
              (0, (_log || _load_log()).default)('Writing push cert to ' + pushOutputFile + '...');
              _fs.default.writeFileSync(pushOutputFile, Buffer.from(pushP12, 'base64'));
              if (pushPrivateSigningKey !== undefined) {
                _keyPath = _path.default.resolve(projectDir, remotePackageName + '_push_cert_private.key');

                _fs.default.writeFileSync(_keyPath, pushPrivateSigningKey);
              }
              (0, (_log || _load_log()).default)('Done writing push cert credentials to disk.');
              if (provisioningProfile !== undefined) {
                p = _path.default.resolve(projectDir, remotePackageName + '.mobileprovision');

                (0, (_log || _load_log()).default)('Writing provisioning profile to ' + p + '...');
                _fs.default.writeFileSync(p, Buffer.from(provisioningProfile, 'base64'));
                (0, (_log || _load_log()).default)('Done writing provisioning profile to disk');
              }
              (0, (_log || _load_log()).default)('Save these important values as well:\n\nDistribution p12 password: ' + (_chalk || _load_chalk()).default.bold(certPassword) + '\nPush p12 password:         ' + (_chalk || _load_chalk()).default.bold(pushPassword) + '\n');
              _context.next = 39;
              break;

            case 36:
              _context.prev = 36;
              _context.t0 = _context['catch'](11);
              throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');

            case 39:

              (0, (_log || _load_log()).default)('All done!');

            case 40:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, undefined, [[11, 36]]);
    }));

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  }(), true);

  program.command('fetch:android:keystore [project-dir]').description("Fetch this project's Android keystore. Writes keystore to PROJECT_DIR/PROJECT_NAME.jks and prints passwords to stdout.").asyncActionProjectDir(function () {
    var _ref4 = (0, (_asyncToGenerator2 || _load_asyncToGenerator()).default)( /*#__PURE__*/(_regenerator || _load_regenerator()).default.mark(function _callee2(projectDir, options) {
      var _ref5, _ref5$args, username, remotePackageName, experienceName, outputFile, credentialMetadata, credentials, keystore, keystorePassword, keyAlias, keyPassword, storeBuf;

      return (_regenerator || _load_regenerator()).default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return (_xdl || _load_xdl()).Exp.getPublishInfoAsync(projectDir);

            case 2:
              _ref5 = _context2.sent;
              _ref5$args = _ref5.args;
              username = _ref5$args.username;
              remotePackageName = _ref5$args.remotePackageName;
              experienceName = _ref5$args.remoteFullPackageName;
              outputFile = _path.default.resolve(projectDir, remotePackageName + '.jks');
              credentialMetadata = {
                username: username,
                experienceName: experienceName,
                platform: 'android'
              };


              (0, (_log || _load_log()).default)('Retreiving Android keystore for ' + experienceName);

              _context2.next = 12;
              return (_xdl || _load_xdl()).Credentials.getCredentialsForPlatform(credentialMetadata);

            case 12:
              credentials = _context2.sent;

              if (credentials) {
                _context2.next = 15;
                break;
              }

              throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');

            case 15:
              keystore = credentials.keystore, keystorePassword = credentials.keystorePassword, keyAlias = credentials.keystoreAlias, keyPassword = credentials.keyPassword;
              storeBuf = Buffer.from(keystore, 'base64');


              (0, (_log || _load_log()).default)('Writing keystore to ' + outputFile + '...');
              _fs.default.writeFileSync(outputFile, storeBuf);
              (0, (_log || _load_log()).default)('Done writing keystore to disk.');

              (0, (_log || _load_log()).default)('Save these important values as well:\n\nKeystore password: ' + (_chalk || _load_chalk()).default.bold(keystorePassword) + '\nKey alias:         ' + (_chalk || _load_chalk()).default.bold(keyAlias) + '\nKey password:      ' + (_chalk || _load_chalk()).default.bold(keyPassword) + '\n');

              (0, (_log || _load_log()).default)('All done!');

            case 22:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, undefined);
    }));

    return function (_x3, _x4) {
      return _ref4.apply(this, arguments);
    };
  }(), true);
};

module.exports = exports['default'];
//# sourceMappingURL=../__sourcemaps__/commands/fetch.js.map
