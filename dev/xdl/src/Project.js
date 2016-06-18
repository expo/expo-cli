'use strict';

import 'instapromise';

import child_process from 'child_process';
import delayAsync from 'delay-async';
import express from 'express';
import FormData from 'form-data';
import freeportAsync from 'freeport-async';
import fs from 'fs';
import joi from 'joi';
import _ from 'lodash';
import ngrok from 'ngrok';
import path from 'path';
import request from 'request';
import treekill from 'tree-kill';

import Api from './Api';
import Config from './Config';
import ErrorCode from './ErrorCode';
import Exp from './Exp';
import Logger from './Logger';
import ProjectSettings from './ProjectSettings';
import UrlUtils from './UrlUtils';
import User from './User';
import XDLError from './XDLError';

const MINIMUM_BUNDLE_SIZE = 500;

let _projectRootToExponentServer = {};
let _projectRootToLogger = {};
let _cachedSignedManifest = {
  manifestString: null,
  signedManifest: null,
};

function _getLogger(projectRoot) {
  let logger = _projectRootToLogger[projectRoot];
  if (!logger) {
    logger = Logger.child({project: path.resolve(projectRoot)});
    _projectRootToLogger[projectRoot] = logger;
  }

  return logger;
}

function _logInfo(projectRoot, tag, message) {
  _getLogger(projectRoot).info({tag}, message.toString());
}

function _logError(projectRoot, tag, message) {
  _getLogger(projectRoot).error({tag}, message.toString());
}

function attachLoggerStream(projectRoot, stream) {
  _getLogger(projectRoot).addStream(stream);
}

async function _assertLoggedInAsync() {
  let user = await User.getCurrentUserAsync();
  if (!user) {
    throw new XDLError(ErrorCode.NOT_LOGGED_IN, 'Not logged in');
  }
}

async function _assertValidProjectRoot(projectRoot) {
  if (!projectRoot) {
    throw new XDLError(ErrorCode.NO_PROJECT_ROOT, 'No project root specified');
  }
}

async function _getFreePortAsync(rangeStart) {
  let port = await freeportAsync(rangeStart);
  if (!port) {
    throw new XDLError(ErrorCode.NO_PORT_FOUND, 'No available port found');
  }

  return port;
}

async function _readConfigJsonAsync(projectRoot) {
  let exp = await Exp.expJsonForRoot(projectRoot).readAsync();
  let pkg = await Exp.packageJsonForRoot(projectRoot).readAsync();

  // Easiest bail-out: package.json is missing
  if (!pkg) {
    _logError(projectRoot, 'exponent', `Error: Can't find package.json`);
    return { exp: {}, pkg: {} };
  }

  // Grab our exp config from package.json (legacy) or exp.json
  if (!exp && pkg.exp) {
    exp = pkg.exp;
    _logError(projectRoot, 'exponent', `Warning: Please move your exp config from package.json to exp.json, support for Exponent configuration in package.json is deprecated.`);
  } else if (!exp && !pkg.exp) {
    _logError(projectRoot, 'exponent', `Error: Missing exp.json. See https://docs.getexponent.com/`);
    return { exp: {}, pkg: {} };
  }

  return { exp, pkg };
}

async function _validateConfigJsonAsync(projectRoot) {
  let { exp, pkg } = await _readConfigJsonAsync(projectRoot);

  // sdkVersion is necessary
  if (!exp.sdkVersion) {
    _logError(projectRoot, 'exponent', `Error: Can't find key exp.sdkVersion in exp.json or package.json. See https://docs.getexponent.com/`);
    return;
  }

  // Warn if sdkVersion is UNVERSIONED
  let sdkVersion = exp.sdkVersion;
  if (sdkVersion === 'UNVERSIONED') {
    _logError(projectRoot, 'exponent', `Warning: Using unversioned Exponent SDK. Do not publish until you set sdkVersion in package.json`);
    return;
  }

  // react-native is required
  if (!pkg.dependencies || !pkg.dependencies['react-native']) {
    _logError(projectRoot, 'exponent', `Error: Can't find react-native in package.json dependencies`);
    return;
  }

  // Exponent fork of react-native is required
  let reactNative = pkg.dependencies['react-native'];
  if (reactNative.indexOf('exponentjs/react-native#') === -1) {
    _logError(projectRoot, 'exponent', `Error: Must use the Exponent fork of react-native. See https://getexponent.com/help`);
    return;
  }


  let reactNativeTag = reactNative.substring(reactNative.lastIndexOf('#') + 1);

  let sdkVersions = await Api.callPathAsync('/--/sdk-versions');
  if (!sdkVersions) {
    _logError(projectRoot, 'exponent', `Error: Couldn't connect to server`);
    return;
  }

  if (!sdkVersions[sdkVersion]) {
    _logError(projectRoot, 'exponent', `Error: Invalid sdkVersion. Valid options are ${_.keys(sdkVersions).join(', ')}`);
    return;
  }

  let sdkVersionObject = sdkVersions[sdkVersion];
  if (sdkVersionObject['exponent-react-native-tag'] !== reactNativeTag) {
    _logError(projectRoot, 'exponent', `Error: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:exponentjs/react-native#${sdkVersionObject['exponent-react-native-tag']}`);
    return;
  }

  // TODO: Check any native module versions here
}

async function _getBundleForPlatformAsync(url, platform) {
  let response = await request.promise.get({
    url: url + `&platform=${platform}`,
    headers: {
      'Exponent-Platform': platform,
    },
  });

  if (response.statusCode !== 200) {
    throw new XDLError(ErrorCode.INVALID_BUNDLE, `Packager returned unexpected code ${response.statusCode}`);
  }

  if (!response.body || response.body.length < MINIMUM_BUNDLE_SIZE) {
    throw new XDLError(ErrorCode.INVALID_BUNDLE, `Bundle is: ${response.body}`);
  }

  return response.body;
}

async function publishAsync(projectRoot, options = {}) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  let schema = joi.object().keys({
    quiet: joi.boolean(),
  });

  try {
    joi.promise.validate(options, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }

  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    throw new XDLError(ErrorCode.NO_PACKAGER_PORT, `No packager found for project at ${projectRoot}.`);
  }

  let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
  let publishUrl = await UrlUtils.constructPublishUrlAsync(projectRoot, entryPoint);
  let [
    iosBundle,
    androidBundle,
  ] = await Promise.all([
    _getBundleForPlatformAsync(publishUrl, 'ios'),
    _getBundleForPlatformAsync(publishUrl, 'android'),
  ]);

  let { exp, pkg } = _readConfigJsonAsync(projectRoot);

  if (Object.keys(exp).length === 0) {
    throw new XDLError(ErrorCode.NO_PACKAGE_JSON, `Couldn't read exp.json file in project at ${projectRoot}`);
  }

  // Support version and name being specified in package.json for legacy
  // support pre: exp.json
  if (!exp.version && pkg.version) {
    exp.version = pkg.version;
  }
  if (!exp.slug && pkg.name) {
    exp.slug = pkg.name;
  }

  let form = new FormData();
  form.append('expJson', JSON.stringify(exp));
  form.append('iosBundle', iosBundle, {
    filename: 'iosBundle',
  });
  form.append('androidBundle', androidBundle, {
    filename: 'androidBundle',
  });

  let response = await Api.callMethodAsync('publish', [options], 'put', form);
  return response;
}

async function _waitForRunningAsync(url) {
  try {
    let response = await request.promise(url);
    // Looking for "Cached Bundles" string is hacky, but unfortunately
    // ngrok returns a 200 when it succeeds but the port it's proxying
    // isn't bound.
    if (response.statusCode >= 200 && response.statusCode < 300 &&
        response.body && response.body.includes('Cached Bundles')) {
      return true;
    }
  } catch (e) {
    // Try again after delay
  }

  await delayAsync(100);
  return _waitForRunningAsync(url);
}

async function startReactNativeServerAsync(projectRoot, options = {}) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  await stopReactNativeServerAsync(projectRoot);

  let packagerPort = await _getFreePortAsync(19001);

  const packageJSON = await Exp.packageJsonForRoot(projectRoot).readAsync();

  // Create packager options
  let packagerOpts = {
    port: packagerPort,
    projectRoots: projectRoot,
    assetRoots: projectRoot,
  };

  const userPackagerOpts = _.get(packageJSON, 'exp.packagerOpts');
  if (userPackagerOpts) {
    packagerOpts = {
      ...packagerOpts,
      ...userPackagerOpts,
    };
  }

  let cliOpts = _.reduce(packagerOpts, (opts, val, key) => {
    if (val && val !== '') {
      opts.push(`--${key}`, val);
    }
    return opts;
  }, ['start']);

  if (options.reset) {
    cliOpts.push('--reset-cache');
  }

  // Get custom CLI path from project package.json, but fall back to node_module path
  let defaultCliPath = path.join(projectRoot, 'node_modules/react-native/local-cli/cli.js');
  const cliPath = _.get(packageJSON, 'exp.rnCliPath', defaultCliPath);

  // Run the copy of Node that's embedded in Electron by setting the
  // ELECTRON_RUN_AS_NODE environment variable
  // Note: the CLI script sets up graceful-fs and sets ulimit to 4096 in the
  // child process
  let packagerProcess = child_process.fork(cliPath, cliOpts, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_PATH: null,
      ELECTRON_RUN_AS_NODE: 1,
    },
    silent: true,
  });

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort,
    packagerPid: packagerProcess.pid,
  });

  // TODO: do we need this? don't know if it's ever called
  process.on('exit', () => {
    treekill(packagerProcess.pid);
  });

  packagerProcess.stdout.setEncoding('utf8');
  packagerProcess.stderr.setEncoding('utf8');
  packagerProcess.stdout.on('data', (data) => {
    _logInfo(projectRoot, 'packager', data.toString());
  });

  packagerProcess.stderr.on('data', (data) => {
    _logError(projectRoot, 'packager', data.toString());
  });

  packagerProcess.on('exit', async (code) => {
    console.log("packager process exited with code", code);
  });

  let packagerUrl = await UrlUtils.constructBundleUrlAsync(projectRoot, {
    urlType: 'http',
    hostType: 'localhost',
  });

  await _waitForRunningAsync(packagerUrl + '/debug');
}

async function stopReactNativeServerAsync(projectRoot) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort || !packagerInfo.packagerPid) {
    console.log(`No packager found for project at ${projectRoot}.`);
    return;
  }

  console.log(`Killing packager process tree: ${packagerInfo.packagerPid}`);
  try {
    await treekill.promise(packagerInfo.packagerPid, 'SIGKILL');
  } catch (e) {
    console.warn(`Error stopping packager process: ` + e.toString());
  }

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort: null,
    packagerPid: null,
  });
}

async function startExponentServerAsync(projectRoot) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  await stopExponentServerAsync(projectRoot);

  let app = express();

  _validateConfigJsonAsync(projectRoot);

  // Serve the manifest.
  let manifestHandler = async (req, res) => {
    try {
      // We intentionally don't `await`. We want to continue trying even
      // if there is a potential error in the package.json and don't want to slow
      // down the request
      _validateConfigJsonAsync(projectRoot);

      let { exp: manifest } = await _readConfigJsonAsync(projectRoot);

      // Get packager opts and then copy into bundleUrlPackagerOpts
      let packagerOpts = await ProjectSettings.getPackagerOptsAsync(projectRoot);
      let bundleUrlPackagerOpts = JSON.parse(JSON.stringify(packagerOpts));
      bundleUrlPackagerOpts.urlType = 'http';
      if (bundleUrlPackagerOpts.hostType === 'redirect') {
        bundleUrlPackagerOpts.hostType = 'tunnel';
      }

      manifest.xde = true; // deprecated
      manifest.developer = {
        tool: Config.developerTool,
      };
      manifest.packagerOpts = packagerOpts;

      let entryPoint = await Exp.determineEntryPointAsync(projectRoot);
      let mainModuleName = UrlUtils.guessMainModulePath(entryPoint);
      let platform = req.headers['exponent-platform'] || 'ios';
      let queryParams = UrlUtils.constructBundleQueryParams(packagerOpts);
      let path = `/${mainModuleName}.bundle?platform=${platform}&${queryParams}`;
      manifest.bundleUrl = await UrlUtils.constructBundleUrlAsync(projectRoot, bundleUrlPackagerOpts) + path;
      manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(projectRoot);
      manifest.mainModuleName = mainModuleName;

      let manifestString = JSON.stringify(manifest);
      let currentUser = await User.getCurrentUserAsync();
      if (req.headers['exponent-accept-signature'] && currentUser) {
        if (_cachedSignedManifest.manifestString === manifestString) {
          manifestString = _cachedSignedManifest.signedManifest;
        } else {
          let publishInfo = await Exp.getPublishInfoAsync(projectRoot);
          let signedManifest = await Api.callMethodAsync('signManifest', [publishInfo.args], 'post', manifest);
          _cachedSignedManifest.manifestString = manifestString;
          _cachedSignedManifest.signedManifest = signedManifest.response;
          manifestString = signedManifest.response;
        }
      }

      res.send(manifestString);
    } catch (e) {
      console.error("Error in manifestHandler:", e, e.stack);
      // 5xx = Server Error HTTP code
      res.status(520).send({"error": e.toString()});
    }
  };

  app.get('/', manifestHandler);
  app.get('/manifest', manifestHandler);
  app.get('/index.exp', manifestHandler);

  let exponentServerPort = await _getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    exponentServerPort,
  });
  let server = app.listen(exponentServerPort, () => {
    let host = server.address().address;
    let port = server.address().port;

    console.log('Local server listening at http://%s:%s', host, port);
  });

  _projectRootToExponentServer[projectRoot] = server;
  await Exp.saveRecentExpRootAsync(projectRoot);
}

// This only works when called from the same process that called
// startExponentServerAsync.
async function stopExponentServerAsync(projectRoot) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  let server = _projectRootToExponentServer[projectRoot];
  if (!server) {
    console.log(`No Exponent server found for project at ${projectRoot}.`);
    return;
  }

  await server.promise.close();
  _projectRootToExponentServer[projectRoot] = null;

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    exponentServerPort: null,
  });
}

async function _connectToNgrokAsync(args, ngrokPid, attempts) {
  try {
    let url = await ngrok.promise.connect(args);
    return url;
  } catch (e) {
    // Attempt to connect 3 times
    if (attempts >= 2) {
      throw new Error(JSON.stringify(e));
    }

    if (!attempts) {
      attempts = 0;
    }

    // Attempt to fix the issue
    if (e.error_code && e.error_code === 103) {
      // Failed to start tunnel. Might be because url already bound to another session.
      if (ngrokPid) {
        try {
          process.kill(ngrokPid, 'SIGKILL');
        } catch (e) {
          console.warn(`Couldn't kill ngrok with PID ${ngrokPid}`);
        }
      } else {
        await ngrok.promise.kill();
      }
    }

    // Wait 100ms and then try again
    await delayAsync(100);
    return _connectToNgrokAsync(args, null, attempts + 1);
  }
}

async function startTunnelsAsync(projectRoot) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort) {
    throw new XDLError(ErrorCode.NO_PACKAGER_PORT, `No packager found for project at ${projectRoot}.`);
  }

  if (!packagerInfo.exponentServerPort) {
    throw new XDLError(ErrorCode.NO_EXPONENT_SERVER_PORT, `No Exponent server found for project at ${projectRoot}.`);
  }

  await stopTunnelsAsync(projectRoot);

  let username = await User.getUsernameAsync();
  let packageShortName = path.parse(projectRoot).base;
  if (!username) {
    username = await Exp.getLoggedOutPlaceholderUsernameAsync();
  }
  let randomness = await Exp.getProjectRandomnessAsync(projectRoot);

  let hostname = [randomness, UrlUtils.domainify(username), UrlUtils.domainify(packageShortName), Config.ngrok.domain].join('.');
  let packagerHostname = 'packager.' + hostname;

  try {
    let exponentServerNgrokUrl = await _connectToNgrokAsync({
      hostname,
      authtoken: Config.ngrok.authToken,
      port: packagerInfo.exponentServerPort,
      proto: 'http',
    }, packagerInfo.ngrokPid);

    let packagerNgrokUrl = await _connectToNgrokAsync({
      hostname: packagerHostname,
      authtoken: Config.ngrok.authToken,
      port: packagerInfo.packagerPort,
      proto: 'http',
    }, packagerInfo.ngrokPid);

    await ProjectSettings.setPackagerInfoAsync(projectRoot, {
      exponentServerNgrokUrl,
      packagerNgrokUrl,
      ngrokPid: ngrok.process().pid,
    });
  } catch (e) {
    console.error("Problem with ngrok: " + e.toString());
    throw e;
  }
}

async function stopTunnelsAsync(projectRoot) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  // This will kill all ngrok tunnels in the process.
  // We'll need to change this if we ever support more than one project
  // open at a time in XDE.

  let packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  let ngrokProcess = ngrok.process();
  let ngrokProcessPid = ngrokProcess ? ngrokProcess.pid : null;

  if (packagerInfo.ngrokPid && packagerInfo.ngrokPid !== ngrokProcessPid) {
    // Ngrok is running in some other process. Kill at the os level.
    try {
      process.kill(packagerInfo.ngrokPid);
    } catch (e) {
      console.warn(`Couldn't kill ngrok with PID ${packagerInfo.ngrokPid}`);
    }
  } else {
    // Ngrok is running from the current process. Kill using ngrok api.
    await ngrok.promise.kill();
  }

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    exponentServerNgrokUrl: null,
    packagerNgrokUrl: null,
    ngrokPid: null,
  });
}

async function setOptionsAsync(projectRoot, options) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  // Check to make sure all options are valid
  let schema = joi.object().keys({
    packagerPort: joi.number().integer(),
  });

  try {
    joi.promise.validate(options, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }

  await ProjectSettings.setPackagerInfoAsync(projectRoot, options);
}

async function getUrlAsync(projectRoot, options = {}) {
  await _assertLoggedInAsync();
  _assertValidProjectRoot(projectRoot);

  return await UrlUtils.constructManifestUrlAsync(projectRoot, options);
}

async function startAsync(projectRoot, options = {}) {
  await startExponentServerAsync(projectRoot);
  await startReactNativeServerAsync(projectRoot, options);
  await startTunnelsAsync(projectRoot);
}

async function stopAsync(projectRoot) {
  await stopTunnelsAsync(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  await stopExponentServerAsync(projectRoot);
}

module.exports = {
  attachLoggerStream,
  getUrlAsync,
  publishAsync,
  setOptionsAsync,
  startAsync,
  startExponentServerAsync,
  startReactNativeServerAsync,
  startTunnelsAsync,
  stopAsync,
  stopExponentServerAsync,
  stopReactNativeServerAsync,
  stopTunnelsAsync,
};
