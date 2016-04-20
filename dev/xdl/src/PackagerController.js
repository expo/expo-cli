'use strict';

import _ from 'lodash';
import child_process from 'child_process';
import crayon from '@ccheever/crayon';
import delayAsync from 'delay-async';
import events from 'events';
import express from 'express';
import freeportAsync from 'freeport-async';
import instapromise from 'instapromise';
import ngrok from 'ngrok';
import path from 'path';
import request from 'request';

import Api from './Api';
import Config from './Config';
import Exp from './Exp';
import Login from './Login';
import ProjectSettings from './ProjectSettings';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';

class PackagerController extends events.EventEmitter {
  constructor(opts) {
    super(opts);

    let DEFAULT_OPTS = {
      port: undefined,
      cliPath: path.join(opts.absolutePath, 'node_modules/react-native/local-cli/cli.js'),
      mainModulePath: 'index.js',
      // absolutePath: root,
    };

    this.opts = Object.assign(DEFAULT_OPTS, opts);
    this._givenOpts = opts;

    this._cachedSignedManifest = {
      manifestString: null,
      signedManifest: null,
    };

    global._PackagerController = this;
  }

  static exit() {
    let pc = global._PackagerController;
    if (pc) {
      if (pc._expressServer) {
        pc._expressServer.close();
      }
      if (pc._packager) {
        pc._packager.kill('SIGTERM');
      }
      if (pc._ngrokUrl || pc._packagerNgrokUrl) {
        ngrok.kill();
      }
    }
  }

  async startOrRestartLocalServerAsync() {
    await this._stopLocalServerAsync();

    let app = express();
    let self = this;

    // Serve the manifest.
    let manifestHandler = async (req, res) => {
      try {
        // N.B. We intentionally don't `await` this. We want to continue trying even
        //  if there is a potential error in the package.json and don't want to slow
        //  down the request
        self.validatePackageJsonAsync();

        let pkg = await Exp.packageJsonForRoot(self.opts.absolutePath).readAsync();
        let manifest = pkg.exp || {};

        // Get packager opts and then copy into bundleUrlPackagerOpts
        let packagerOpts = await ProjectSettings.getPackagerOptsAsync(self.opts.absolutePath);
        let bundleUrlPackagerOpts = JSON.parse(JSON.stringify(packagerOpts));
        bundleUrlPackagerOpts.http = true;
        bundleUrlPackagerOpts.redirect = false;

        manifest.xde = true; // deprecated
        manifest.developer = {
          tool: Config.developerTool,
        };
        manifest.packagerOpts = packagerOpts;

        let mainModuleName = UrlUtils.guessMainModulePath(self.opts.entryPoint);
        let platform = req.headers['exponent-platform'] || 'ios';
        let queryParams = UrlUtils.constructBundleQueryParams(packagerOpts);
        let path = `/${mainModuleName}.bundle?platform=${platform}&${queryParams}`;
        manifest.bundleUrl = await UrlUtils.constructBundleUrlAsync(self.getRoot(), bundleUrlPackagerOpts) + path;
        manifest.debuggerHost = await UrlUtils.constructDebuggerHostAsync(self.getRoot());
        manifest.mainModuleName = mainModuleName;

        let manifestString = JSON.stringify(manifest);
        let currentUser = await Login.currentUserAsync();
        if (req.headers['exponent-accept-signature'] && currentUser) {
          if (self._cachedSignedManifest.manifestString === manifestString) {
            manifestString = self._cachedSignedManifest.signedManifest;
          } else {
            let publishInfo = await Exp.getPublishInfoAsync(self.getRoot());
            let signedManifest = await Api.callMethodAsync('signManifest', [publishInfo.args], 'post', manifest);
            self._cachedSignedManifest.manifestString = manifestString;
            self._cachedSignedManifest.signedManifest = signedManifest.response;
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

    this._expressServer = app.listen(this.opts.port, () => {
      let host = this._expressServer.address().address;
      let port = this._expressServer.address().port;

      console.log('Local server listening at http://%s:%s', host, port);
    });
  }

  async getUsernameAsync() {
    let user = await Login.currentUserAsync();
    if (user) {
      return user.username;
    } else {
      return null;
    }
  }

  async getRandomnessAsync() {
    let ps = await ProjectSettings.readAsync(this.opts.absolutePath);
    let randomness = ps.urlRandomness;
    if (!randomness) {
      randomness = UrlUtils.someRandomness();
      ProjectSettings.setAsync(this.opts.absolutePath, {'urlRandomness': randomness});
    }
    return randomness;
  }

  async _connectToNgrokAsync(args, attempts) {
    try {
      return await ngrok.promise.connect(args);
    } catch (e) {
      if (attempts >= 2) {
        throw e;
      }

      // Attempt to connect 3 times
      if (!attempts) {
        attempts = 0;
      }

      return this._connectToNgrokAsync(args, attempts + 1);
    }
  }

  async startOrRestartNgrokAsync() {
    if (this._ngrokUrl || this._packagerNgrokUrl) {
      console.log("Waiting for ngrok to disconnect...");
      await this._stopNgrokAsync();
      console.log("Disconnected ngrok; restarting...");
    }

    this.emit('ngrok-will-start', this.opts.port);
    this.emit('packager-ngrok-will-start', this.opts.packagerPort);

    // Don't try to parallelize these because they both might
    // mess with the same settings.json file, which could get gnarly
    let username = await this.getUsernameAsync();
    let packageShortName = this.getProjectShortName();
    if (!username) {
      username = await this.getLoggedOutPlaceholderUsernameAsync();
    }
    let randomness = await this.getRandomnessAsync();

    let hostname = [randomness, UrlUtils.domainify(username), UrlUtils.domainify(packageShortName), Config.ngrok.domain].join('.');
    let packagerHostname = 'packager.' + hostname;

    try {
      this._ngrokUrl = await this._connectToNgrokAsync({
        hostname,
        authtoken: Config.ngrok.authToken,
        port: this.opts.port,
        proto: 'http',
      });

      this._packagerNgrokUrl = await this._connectToNgrokAsync({
        hostname: packagerHostname,
        authtoken: Config.ngrok.authToken,
        port: this.opts.packagerPort,
        proto: 'http',
      });
    } catch (e) {
      console.error("Problem with ngrok: " + JSON.stringify(e));
      throw e;
    }

    this.emit('ngrok-did-start', this.opts.port, this._ngrokUrl);
    this.emit('packager-ngrok-did-start', this.opts.packagerPort, this._packagerNgrokUrl);
    this.emit('ngrok-ready', this.opts.port, this._ngrokUrl);
    this.emit('packager-ngrok-ready', this.opts.packagerPort, this._packagerNgrokUrl);

    console.log("Connected ngrok to port " + this.opts.port + " via " + this._ngrokUrl);
    console.log("Connected packager ngrok to port " + this.opts.packagerPort + " via " + this._packagerNgrokUrl);
  }

  async getLoggedOutPlaceholderUsernameAsync() {
    let lpu = await UserSettings.getAsync('loggedOutPlaceholderUsername', null);
    if (!lpu) {
      lpu = UrlUtils.randomIdentifierForLoggedOutUser();
      await UserSettings.setAsync('loggedOutPlaceholderUsername', lpu);
    }
    return lpu;
  }

  async startOrRestartPackagerAsync(options = {}) {
    if (!this.opts.packagerPort) {
      throw new Error("`this.opts.packagerPort` must be set before starting the packager!");
    }

    let root = this.getRoot();
    if (!root) {
      throw new Error("`this.opts.absolutePath` must be set to start the packager!");
    }

    await this._stopPackagerAsync();

    const packageJSON = await Exp.packageJsonForRoot(this.opts.absolutePath).readAsync()

    let packagerOpts = {
      port: this.opts.packagerPort,
      projectRoots: root,
      assetRoots: root,
    };

    const userPackagerOpts = _.get(packageJSON, 'exp.packagerOpts', null);
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
    const cliPath = _.get(packageJSON, 'exp.rnCliPath', this.opts.cliPath);

    // Run the copy of Node that's embedded in Electron by setting the
    // ELECTRON_RUN_AS_NODE environment variable
    // Note: the CLI script sets up graceful-fs and sets ulimit to 4096 in the
    // child process
    let packagerProcess = child_process.fork(cliPath, cliOpts, {
      cwd: root,
      env: {
        ...process.env,
        NODE_PATH: null,
        ELECTRON_RUN_AS_NODE: 1,
      },
      silent: true,
    });
    process.on('exit', () => {
      packagerProcess.kill();
    });
    this._packager = packagerProcess;
    this._packager.stdout.setEncoding('utf8');
    this._packager.stderr.setEncoding('utf8');
    this._packager.stdout.on('data', (data) => {
      this.emit('stdout', data);

      if (data.match(/React packager ready\./)) {
        // this._packagerReadyFulfill(this._packager);
        // this._packagerReady = true;
        this.emit('packager-ready', this._packager);
      }

      // crayon.yellow.log("STDOUT:", data);
    });

    this._packager.stderr.on('data', (data) => {
      this.emit('stderr', data);
      // crayon.orange.error("STDERR:", data);
    });

    this.packagerExited$ = new Promise((fulfill, reject) => {
      this._packagerExitedFulfill = fulfill;
      this._packagerExitedReject = reject;
    });

    this._packager.on('exit', (code) => {
      console.log("packager process exited with code", code);
      // console.log("packagerExited$ should fulfill");
      this._packagerExitedFulfill(code);
      this.emit('packager-stopped', code);
    });
  }

  async _stopLocalServerAsync() {
    if (this._expressServer) {
      console.log("Waiting for express to close...");
      await this._expressServer.close();
      console.log("Closed express; restarting...");
    }
  }

  async _stopPackagerAsync() {
    if (this._packager && (!this._packager.killed && (this._packager.exitCode === null))) {
      console.log("Stopping packager...");
      let stopped$ = new Promise((fulfill, reject) => {
        let timeout = setTimeout(() => {
          console.error("Stopping packager timed out!");
          reject();
        }, 10000);
        this._packager.on('exit', (exitCode) => {
          clearTimeout(timeout);
          fulfill(exitCode);
        });
      });
      this.emit('packager-will-stop');
      this._packager.kill('SIGTERM');
      return stopped$;
    } else {
      console.log("Packager already stopped.");
    }
  }

  async _stopNgrokAsync() {
    if (this._ngrokUrl) {
      this.emit('ngrok-will-disconnect', this._ngrokUrl);
      try {
        await ngrok.promise.disconnect(this._ngrokUrl);
        let oldNgrokUrl = this._ngrokUrl;
        this._ngrokUrl = null;
        // this._ngrokDisconnectedFulfill(oldNgrokUrl);
        // console.log("Disconnected ngrok");
        this.emit('ngrok-disconnected', oldNgrokUrl);
      } catch (e) {
        console.error("Problem disconnecting ngrok:", e);
        // this._ngrokDisconnectedReject(e);
        this.emit('ngrok-disconnect-err', e);
      }
    }

    if (this._packagerNgrokUrl) {
      this.emit('packager-ngrok-will-disconnect', this._packagerNgrokUrl);
      try {
        await ngrok.promise.disconnect(this._packagerNgrokUrl);
        let oldNgrokUrl = this._packagerNgrokUrl;
        this._packagerNgrokUrl = null;
        // this._ngrokDisconnectedFulfill(oldNgrokUrl);
        // console.log("Disconnected ngrok");
        this.emit('packager-ngrok-disconnected', oldNgrokUrl);
      } catch (e) {
        console.error("Problem disconnecting packager ngrok:", e);
        // this._ngrokDisconnectedReject(e);
        this.emit('packager-ngrok-disconnect-err', e);
      }
    }
  }

  async _waitForRunningAsync(url) {
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

    await delayAsync(500);
    return this._waitForRunningAsync(url);
  }

  async startAsync() {
    this.validatePackageJsonAsync();

    if (!this.opts.entryPoint) {
      console.log("Determining entry point automatically...");
      this.opts.entryPoint = await Exp.determineEntryPointAsync(this.getRoot());
      console.log("Entry point: " + this.opts.entryPoint);
    }

    if (!this.opts.port || !this.opts.packagerPort) {
      let ports = await freeportAsync.rangeAsync(2, 19000);
      this.opts.port = ports[0];
      this.opts.packagerPort = ports[1];
    }

    await Promise.all([
      this.startOrRestartLocalServerAsync(),
      this.startOrRestartPackagerAsync(),
      this.startOrRestartNgrokAsync(),
    ]);

    // Wait until we can hit the packager's debug page over ngrok.
    await this._waitForRunningAsync(this.getPackagerNgrokUrl() + '/debug');

    await ProjectSettings.setPackagerInfoAsync(this.opts.absolutePath, {
      packagerPort: this.opts.packagerPort,
      port: this.opts.port,
      ngrok: this.getNgrokUrl(),
      packagerNgrok: this._packagerNgrokUrl,
    });

    return this;
  }

  async stopAsync() {
    return await Promise.all([
      this._stopPackagerAsync(),
      this._stopNgrokAsync(),
      this._stopLocalServerAsync(),
    ]);
  }

  async getNgrokUrlAsync() {
    return this.getNgrokUrl();
  }

  getNgrokUrl() {
    if (this._ngrokUrl) {
      // ngrok reports https URLs, but to use https/TLS, we actually need to do a bunch of steps
      // to set up the certificates. Those are (somewhat) documented here:
      // https://ngrok.com/docs#tls-cert-warnings
      // Until we have that setup properly, we'll transform these URLs into http URLs
      return this._ngrokUrl.replace(/^https/, 'http');
    } else {
      return this._ngrokUrl;
    }
  }

  getPackagerNgrokUrl() {
    if (this._packagerNgrokUrl) {
      // ngrok reports https URLs, but to use https/TLS, we actually need to do a bunch of steps
      // to set up the certificates. Those are (somewhat) documented here:
      // https://ngrok.com/docs#tls-cert-warnings
      // Until we have that setup properly, we'll transform these URLs into http URLs
      return this._packagerNgrokUrl.replace(/^https/, 'http');
    } else {
      return this._packagerNgrokUrl;
    }
  }

  getProjectShortName() {
    return path.parse(this.opts.absolutePath).base;
  }

  getRoot() {
    return this.opts.absolutePath;
  }

  async validatePackageJsonAsync() {
    let pkg = await Exp.packageJsonForRoot(this.opts.absolutePath).readAsync();
    if (!pkg) {
      this.emit('stderr', `Error: Can't find package.json`);
      return;
    }

    if (!pkg.dependencies || !pkg.dependencies['react-native']) {
      this.emit('stderr', `Error: Can't find react-native in package.json dependencies`);
      return;
    }

    let reactNative = pkg.dependencies['react-native'];
    if (reactNative.indexOf('exponentjs/react-native#') === -1) {
      this.emit('stderr', `Error: Must use Exponent fork of react-native. See https://exponentjs.com/help`);
      return;
    }

    if (!pkg.exp || !pkg.exp.sdkVersion) {
      this.emit('stderr', `Error: Can't find key exp.sdkVersion in package.json. See https://exponentjs.com/help`);
      return;
    }

    let sdkVersion = pkg.exp.sdkVersion;
    if (sdkVersion === 'UNVERSIONED') {
      this.emit('stderr', `Warning: Using unversioned Exponent SDK. Do not publish until you set sdkVersion in package.json`);
      return;
    }

    let reactNativeTag = reactNative.substring(reactNative.lastIndexOf('#') + 1);

    let sdkVersions = await Api.callPathAsync('/--/sdk-versions');
    if (!sdkVersions) {
      this.emit('stderr', `Error: Couldn't connect to server`);
      return;
    }

    if (!sdkVersions[sdkVersion]) {
      this.emit('stderr', `Error: Invalid sdkVersion. Valid options are ${_.keys(sdkVersions).join(', ')}`);
      return;
    }

    let sdkVersionObject = sdkVersions[sdkVersion];
    if (sdkVersionObject['exponent-react-native-tag'] !== reactNativeTag) {
      this.emit('stderr', `Error: Invalid version of react-native for sdkVersion ${sdkVersion}. Use github:exponentjs/react-native#${sdkVersionObject['exponent-react-native-tag']}`);
      return;
    }

    // Check any native module versions here
  }
}

module.exports = PackagerController;

function _rstrip(s) {
  if (s) {
    return s.replace(/\s*$/, '');
  } else {
    return s;
  }
}

PackagerController.testInstance = (opts) => {
  let pc = new PackagerController({
    absolutePath: path.resolve(__dirname, '../template'),
    // we just let entryPoint get determined automatically by the PackagerController
    ...opts,
  });
  pc.on('stdout', (line) => { crayon.green.log(_rstrip(line)); });
  pc.on('stderr', (line) => { crayon.red.log(_rstrip(line)); });
  pc.on('packager-stopped', () => {
    crayon.orange('packager-stopped');
  });
  return pc;


}
