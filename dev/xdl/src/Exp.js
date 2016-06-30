let JsonFile = require('@exponent/json-file');

import 'instapromise';

import targz from 'tar.gz';
import download from 'download';
import existsAsync from 'exists-async';
let fs = require('fs');
let mkdirp = require('mkdirp');
let path = require('path');
import spawnAsync from '@exponent/spawn-async';
import joi from 'joi';

let Api = require('./Api');
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
let User = require('./User');
let UrlUtils = require('./UrlUtils');
let UserSettings = require('./UserSettings');
let XDLError = require('./XDLError');
let ProjectSettings = require('./ProjectSettings');

function packageJsonForRoot(root) {
  return new JsonFile(path.join(root, 'package.json'));
}

function expJsonForRoot(root) {
  return new JsonFile(path.join(root, 'exp.json'), {json5: true});
}

async function expConfigForRootAsync(root) {
  let pkg, exp;
  try {
    pkg = await packageJsonForRoot(root).readAsync();
    exp = await expJsonForRoot(root).readAsync();
  } catch (e) {
    // exp or pkg missing
  }

  if (!exp && pkg) {
    exp = pkg.exp;
  }

  return exp;
}

async function determineEntryPointAsync(root) {
  let exp = await expConfigForRootAsync(root);
  let pkgJson = packageJsonForRoot(root);
  let pkg = await pkgJson.readAsync();
  let { main } = pkg;

  // NOTE(brentvatne): why do we have entryPoint and main?
  let entryPoint = main || 'index.js';
  if (exp && exp.entryPoint) {
    entryPoint = exp.entryPoint;
  }
  return entryPoint;
}

function _starterAppCacheDirectory() {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let dir = path.join(dotExponentHomeDirectory, 'starter-app-cache');
  mkdirp.sync(dir);
  return dir;
}

async function _downloadStarterAppAsync(name) {
  let versions = await Api.versionsAsync();
  let starterAppVersion = versions.starterApps[name].version;
  let filename = `${name}-${starterAppVersion}.tar.gz`;
  let starterAppPath = path.join(_starterAppCacheDirectory(), filename);

  if (await existsAsync(starterAppPath)) {
    return starterAppPath;
  }

  let url = `https://s3.amazonaws.com/exp-starter-apps/${filename}`;
  await new download().get(url).dest(_starterAppCacheDirectory()).promise.run();
  return starterAppPath;
}

async function _extract(archive, dir) {
  try {
    await spawnAsync('tar', ['-xvf', archive, '-C', dir], {
      stdio: 'inherit',
      cwd: __dirname,
    });
  } catch (e) {
    await targz().extract(archive, dir);
  }
}

async function createNewExpAsync(selectedDir, extraPackageJsonFields, opts) {
  // Validate
  let schema = joi.object().keys({
    name: joi.string().required(),
  });

  try {
    await joi.promise.validate(opts, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }

  let name = opts.name;
  let root = path.join(selectedDir, name);

  let fileExists = true;
  try {
    // If file doesn't exist it will throw an error.
    // Don't want to continue unless there is nothing there.
    fs.statSync(root);
  } catch (e) {
    fileExists = false;
  }

  if (fileExists) {
    throw new XDLError(ErrorCode.DIRECTORY_ALREADY_EXISTS, `${root} already exists. Please choose a different directory or project name.`);
  }

  // Download files
  await mkdirp.promise(root);

  Logger.notifications.info({code: NotificationCode.PROGRESS}, 'Downloading project files...');
  let starterAppPath = await _downloadStarterAppAsync('default');

  // Extract files
  Logger.notifications.info({code: NotificationCode.PROGRESS}, 'Extracting project files...');
  await _extract(starterAppPath, root);

  // Update files
  Logger.notifications.info({code: NotificationCode.PROGRESS}, 'Customizing project...');

  let author = await UserSettings.getAsync('email', null);
  let packageJsonFile = new JsonFile(path.join(root, 'package.json'));
  let packageJson = await packageJsonFile.readAsync();
  packageJson = Object.assign(packageJson, extraPackageJsonFields);

  let data = Object.assign(packageJson, {
    name,
    version: '0.0.0',
    description: "Hello Exponent!",
    author,
  });

  await packageJsonFile.writeAsync(data);

  // Custom code for replacing __NAME__ in main.js
  let mainJs = await fs.readFile.promise(path.join(root, 'main.js'), 'utf8');
  let customMainJs = mainJs.replace(/__NAME__/g, data.name);
  await fs.writeFile.promise(path.join(root, 'main.js'), customMainJs, 'utf8');

  // Update exp.json
  let expJson = await fs.readFile.promise(path.join(root, 'exp.json'), 'utf8');
  let customExpJson = expJson.replace(/\"My New Project\"/, `"${data.name}"`).replace(/\"my-new-project\"/, `"${data.name}"`);
  await fs.writeFile.promise(path.join(root, 'exp.json'), customExpJson, 'utf8');

  return root;
}

async function saveRecentExpRootAsync(root) {
  root = path.resolve(root);

  // Write the recent Exps JSON file
  let recentExpsJsonFile = UserSettings.recentExpsJsonFile();
  let recentExps = await recentExpsJsonFile.readAsync({cantReadFileDefault: []});
  // Filter out copies of this so we don't get dupes in this list
  recentExps = recentExps.filter(function(x) {
    return x !== root;
  });
  recentExps.unshift(root);
  return await recentExpsJsonFile.writeAsync(recentExps.slice(0, 100));
}

function getHomeDir() {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

function makePathReadable(pth) {
  let homedir = getHomeDir();
  if (pth.substr(0, homedir.length) === homedir) {
    return '~' + pth.substr(homedir.length);
  } else {
    return pth;
  }
}

async function expInfoAsync(root) {
  let pkgJson = packageJsonForRoot(root);

  let name, description, icon;
  try {
    let exp = await expJsonForRoot(root).readAsync();
    name = exp.name;
    description = exp.description;
    icon = exp.iconUrl;
  } catch (err) {
    let pkg = await pkgJson.readAsync();
    name = pkg.name;
    description = pkg.description;
    icon = pkg.exp && pkg.exp.iconUrl;
  }

  return {
    readableRoot: makePathReadable(root),
    root,
    name,
    description,
    icon,
  };
}

async function expInfoSafeAsync(root) {
  try {
    return await expInfoAsync(root);
  } catch (e) {
    return null;
  }
}

// TODO: remove / change, no longer publishInfo, this is just used for signing
async function getPublishInfoAsync(root) {
  let username = await User.getUsernameAsync();
  let pkg;
  let exp;

  try {
    pkg = await packageJsonForRoot(root).readAsync();
    exp = await expJsonForRoot(root).readAsync();
  } catch (e) {
    // exp or pkg missing
  }

  let name;
  let version;

  // Support legacy package.json with exp
  if (!exp && pkg.exp) {
    exp = pkg.exp;
    name = pkg.name;
    version = pkg.version;
  } else {
    name = exp.slug;
    version = exp.version;
  }

  if (!exp || !exp.sdkVersion) {
    throw new Error(`exp.sdkVersion is missing from package.json file`);
  }

  let remotePackageName = name;
  let remoteUsername = username;
  let remoteFullPackageName = '@' + remoteUsername + '/' + remotePackageName;
  let localPackageName = name;
  let packageVersion = version;
  let sdkVersion = exp.sdkVersion;

  let entryPoint = await determineEntryPointAsync(root);
  let ngrokUrl = await UrlUtils.constructPublishUrlAsync(root, entryPoint);
  return {
    args: {
      username,
      localPackageName,
      packageVersion,
      remoteUsername,
      remotePackageName,
      remoteFullPackageName,
      ngrokUrl,
      sdkVersion,
    },
    body: pkg,
  };
}

async function recentValidExpsAsync() {
  let recentExpsJsonFile = UserSettings.recentExpsJsonFile();
  let recentExps = await recentExpsJsonFile.readAsync({cantReadFileDefault: []});

  let results = await Promise.all(recentExps.map(expInfoSafeAsync));
  let filteredResults = results.filter(result => result);
  return filteredResults.slice(0, 5);
}

async function sendAsync(recipient, url_) {
  let result = await Api.callMethodAsync('send', [recipient, url_]);
  return result;
}

// TODO: figure out where these functions should live
async function getProjectRandomnessAsync(projectRoot) {
  let ps = await ProjectSettings.readAsync(projectRoot);
  let randomness = ps.urlRandomness;
  if (!randomness) {
    randomness = UrlUtils.someRandomness();
    ProjectSettings.setAsync(projectRoot, {'urlRandomness': randomness});
  }
  return randomness;
}

async function getLoggedOutPlaceholderUsernameAsync() {
  let lpu = await UserSettings.getAsync('loggedOutPlaceholderUsername', null);
  if (!lpu) {
    lpu = UrlUtils.randomIdentifierForLoggedOutUser();
    await UserSettings.setAsync('loggedOutPlaceholderUsername', lpu);
  }
  return lpu;
}

module.exports = {
  expConfigForRootAsync,
  createNewExpAsync,
  determineEntryPointAsync,
  expInfoSafeAsync,
  getPublishInfoAsync,
  expJsonForRoot,
  packageJsonForRoot,
  recentValidExpsAsync,
  saveRecentExpRootAsync,
  sendAsync,
  getProjectRandomnessAsync,
  getLoggedOutPlaceholderUsernameAsync,
};
