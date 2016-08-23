/**
 * @flow
 */

let JsonFile = require('@exponent/json-file');

import 'instapromise';

import targz from 'tar.gz';
import download from 'download';
import existsAsync from 'exists-async';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import spawnAsync from '@exponent/spawn-async';
import joi from 'joi';

import * as Analytics from './Analytics';
import Api from './Api';
import * as Binaries from './Binaries';
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as User from './User';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import XDLError from './XDLError';
import * as ProjectSettings from './ProjectSettings';

export const ENTRY_POINT_PLATFORM_TEMPLATE_STRING = 'PLATFORM_GOES_HERE';

export function packageJsonForRoot(root: string) {
  return new JsonFile(path.join(root, 'package.json'));
}

export function expJsonForRoot(root: string) {
  return new JsonFile(path.join(root, 'exp.json'), {json5: true});
}

export async function expConfigForRootAsync(root: string) {
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

function _doesFileExist(file) {
  try {
    return fs.statSync(file).isFile();
  } catch (e) {
    return false;
  }
}

function _getPlatformSpecificEntryPoint(entryPoint, platform) {
  if (entryPoint.endsWith('.js')) {
    return `${entryPoint.substring(0, entryPoint.length - 3)}.${platform}.js`;
  } else {
    return `${entryPoint}.${platform}.js`;
  }
}

// You must call UrlUtils.getPlatformSpecificBundleUrl to remove the platform template string
export async function determineEntryPointAsync(root: string) {
  let exp = await expConfigForRootAsync(root);
  let pkgJson = packageJsonForRoot(root);
  let pkg = await pkgJson.readAsync();
  let { main } = pkg;

  // entryPoint is relative to the packager root and main is relative
  // to the project root. So if your rn-cli.config.js points to a different
  // root than the project root, these can be different. Most of the time
  // you should use main.
  let entryPoint = main || 'index.js';
  let hasSeparateIosAndAndroidFiles = false;
  if (!_doesFileExist(path.join(root, entryPoint)) &&
    (_doesFileExist(path.join(root, _getPlatformSpecificEntryPoint(entryPoint, 'android'))) || _doesFileExist(path.join(root, _getPlatformSpecificEntryPoint(entryPoint, 'ios'))))) {
    hasSeparateIosAndAndroidFiles = true;
  }

  if (exp && exp.entryPoint) {
    entryPoint = exp.entryPoint;
  }

  if (hasSeparateIosAndAndroidFiles) {
    return _getPlatformSpecificEntryPoint(entryPoint, ENTRY_POINT_PLATFORM_TEMPLATE_STRING);
  } else {
    return entryPoint;
  }
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
  let starterAppName = `${name}-${starterAppVersion}`;
  let filename = `${starterAppName}.tar.gz`;
  let starterAppPath = path.join(_starterAppCacheDirectory(), filename);

  if (await existsAsync(starterAppPath)) {
    return {
      starterAppPath,
      starterAppName,
    };;
  }

  let url = `https://s3.amazonaws.com/exp-starter-apps/${filename}`;
  await new download().get(url).dest(_starterAppCacheDirectory()).promise.run();
  return {
    starterAppPath,
    starterAppName,
  };
}

async function _extractWindowsAsync(archive, starterAppName, dir) {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let tmpDir = path.join(dotExponentHomeDirectory, 'starter-app-cache', 'tmp');
  let tmpFile = path.join(tmpDir, `${starterAppName}.tar`)
  let binary = path.join(Binaries.getBinariesPath(), '7z1602-extra', '7za');
  try {
    await spawnAsync(binary, ['x', archive, '-aoa', `-o${tmpDir}`]);
    await spawnAsync(binary, ['x', tmpFile, '-aoa', `-o${dir}`]);
  } catch (e) {
    console.error(e.message);
    console.error(e.stderr);
    throw e;
  }
}

async function _extractAsync(archive, starterAppName, dir) {
  try {
    if (process.platform === 'win32') {
      await _extractWindowsAsync(archive, starterAppName, dir);
    } else {
      await spawnAsync('tar', ['-xvf', archive, '-C', dir], {
        stdio: 'inherit',
        cwd: __dirname,
      });
    }
  } catch (e) {
    // tar.gz node module doesn't work consistently with big files, so only
    // use it as a backup.
    console.error(e.message);
    await targz().extract(archive, dir);
  }
}

export async function createNewExpAsync(selectedDir: string, extraPackageJsonFields: any, opts: any) {
  // Validate
  let schema = joi.object().keys({
    name: joi.string().required(),
  });

  // Should we validate that name is a valid name here?

  try {
    await joi.promise.validate(opts, schema);
  } catch (e) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, e.toString());
  }

  let name = opts.name;
  let root = path.join(selectedDir, name);

  Analytics.logEvent('New Project', {
    selectedDir,
    name,
  });

  let fileExists = true;
  try {
    // If file doesn't exist it will throw an error.
    // Don't want to continue unless there is nothing there.
    fs.statSync(root);
  } catch (e) {
    fileExists = false;
  }

  if (fileExists) {
    throw new XDLError(ErrorCode.DIRECTORY_ALREADY_EXISTS, `That directory already exists. Please choose a different parent directory or project name. (${root})`);
  }

  // Download files
  await mkdirp.promise(root);

  Logger.notifications.info({code: NotificationCode.PROGRESS}, 'Downloading project files...');
  let { starterAppPath, starterAppName } = await _downloadStarterAppAsync('default');

  // Extract files
  Logger.notifications.info({code: NotificationCode.PROGRESS}, 'Extracting project files...');
  await _extractAsync(starterAppPath, starterAppName, root);

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

export async function saveRecentExpRootAsync(root: string) {
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

function getHomeDir(): string {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'] || '';
}

function makePathReadable(pth) {
  let homedir = getHomeDir();
  if (pth.substr(0, homedir.length) === homedir) {
    return `~${pth.substr(homedir.length)}`;
  } else {
    return pth;
  }
}

export async function expInfoAsync(root: string) {
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

export async function expInfoSafeAsync(root: string) {
  try {
    return await expInfoAsync(root);
  } catch (e) {
    return null;
  }
}

type PublishInfo = {
  args: {
    username: string,
    remoteUsername: string,
    remotePackageName: string,
    remoteFullPackageName: string,
    bundleIdentifierIOS: ?string,
    packageNameAndroid: ?string,
  },
};

// TODO: remove / change, no longer publishInfo, this is just used for signing
export async function getPublishInfoAsync(root: string): Promise<PublishInfo> {
  let username = await User.getUsernameAsync();
  if (!username) {
    throw new Error(`Can't get username!`);
  }
  let pkg: any;
  let exp: any;

  try {
    pkg = await packageJsonForRoot(root).readAsync();
    exp = await expJsonForRoot(root).readAsync();
  } catch (e) {
    // exp or pkg missing
  }

  let name;
  let version;
  // Support legacy package.json with exp
  if (!exp && pkg && pkg.exp) {
    exp = pkg.exp;
    name = pkg.name;
    version = pkg.version;
  } else if (exp && pkg) {
    name = exp.slug;
    version = pkg.version || exp.version;
  }

  if (!exp || !exp.sdkVersion) {
    throw new Error(`sdkVersion is missing from exp.json`);
  }

  if (!name) {
    throw new Error(`slug field is missing from exp.json`);
  }

  if (!version) {
    throw new Error(`Can't get version of package.`);
  }

  let remotePackageName = name;
  let remoteUsername = username;
  let remoteFullPackageName = `@${remoteUsername}/${remotePackageName}`;
  let bundleIdentifierIOS = exp.ios ? exp.ios.bundleIdentifier : null;
  let packageNameAndroid = exp.android ? exp.android.package : null;

  return {
    args: {
      username,
      remoteUsername,
      remotePackageName,
      remoteFullPackageName,
      bundleIdentifierIOS,
      packageNameAndroid, // TODO: this isn't used anywhere
    },
  };
}

export async function recentValidExpsAsync() {
  let recentExpsJsonFile = UserSettings.recentExpsJsonFile();
  let recentExps = await recentExpsJsonFile.readAsync({cantReadFileDefault: []});

  let results = await Promise.all(recentExps.map(expInfoSafeAsync));
  let filteredResults = results.filter(result => result);
  return filteredResults.slice(0, 5);
}

export async function sendAsync(recipient: string, url_: string) {
  let result = await Api.callMethodAsync('send', [recipient, url_]);
  return result;
}

// TODO: figure out where these functions should live
export async function getProjectRandomnessAsync(projectRoot: string) {
  let ps = await ProjectSettings.readAsync(projectRoot);
  let randomness = ps.urlRandomness;
  if (randomness) {
    return randomness;
  } else {
    return resetProjectRandomnessAsync(projectRoot);
  }
}

export async function resetProjectRandomnessAsync(projectRoot: string) {
  let randomness = UrlUtils.someRandomness();
  ProjectSettings.setAsync(projectRoot, {'urlRandomness': randomness});
  return randomness;
}
