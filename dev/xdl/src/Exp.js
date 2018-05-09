/**
 * @flow
 */

import promisify from 'util.promisify';
import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import JsonFile from '@expo/json-file';
import rimraf from 'rimraf';

import * as Analytics from './Analytics';
import Api from './Api';
import * as Binaries from './Binaries';
import ErrorCode from './ErrorCode';
import * as Extract from './Extract';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as ProjectUtils from './project/ProjectUtils';
import UserManager from './User';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import XDLError from './XDLError';
import * as ProjectSettings from './ProjectSettings';
import MessageCode from './MessageCode';

// FIXME(perry) eliminate usage of this template
export const ENTRY_POINT_PLATFORM_TEMPLATE_STRING = 'PLATFORM_GOES_HERE';

export { default as convertProjectAsync } from './project/Convert';

const mkdirpAsync = promisify(mkdirp);

export async function determineEntryPointAsync(root: string) {
  let { exp, pkg } = await ProjectUtils.readConfigJsonAsync(root);

  // entryPoint is relative to the packager root and main is relative
  // to the project root. So if your rn-cli.config.js points to a different
  // root than the project root, these can be different. Most of the time
  // you should use main.
  let entryPoint = pkg.main || 'index.js';
  if (exp && exp.entryPoint) {
    entryPoint = exp.entryPoint;
  }

  return entryPoint;
}

function _starterAppCacheDirectory() {
  let dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  let dir = path.join(dotExpoHomeDirectory, 'starter-app-cache');
  mkdirp.sync(dir);
  return dir;
}

async function _downloadStarterAppAsync(templateId, progressFunction, retryFunction) {
  let versions = await Api.versionsAsync();
  let templateApp = versions.templatesv2.find(template => template.id === templateId);
  if (!templateApp) {
    throw new XDLError(ErrorCode.INVALID_OPTIONS, `No template app with id ${templateId}.`);
  }

  let starterAppPath = path.join(
    _starterAppCacheDirectory(),
    `${templateId}-${templateApp.version}.tar.gz`
  );

  if (await fs.exists(starterAppPath)) {
    return starterAppPath;
  }

  Logger.notifications.info({ code: NotificationCode.PROGRESS }, MessageCode.DOWNLOADING);
  await Api.downloadAsync(templateApp.url, starterAppPath, {}, progressFunction, retryFunction);
  return starterAppPath;
}

export async function downloadTemplateApp(templateId: string, selectedDir: string, opts: any) {
  let name = opts.name;
  let root = path.join(selectedDir, name);

  Analytics.logEvent('New Project', {
    selectedDir,
    name,
  });

  let stats;
  try {
    // If file doesn't exist it will throw an error.
    // Don't want to continue unless there is nothing there.
    stats = fs.statSync(root);
  } catch (e) {
    stats = null;
  }
  // This check is required because without it, the retry button would throw an error because the directory already exists,
  // even though it is empty.
  if (stats && !(stats.isDirectory() && fs.readdirSync(root).length === 0)) {
    throw new XDLError(
      ErrorCode.DIRECTORY_ALREADY_EXISTS,
      `The path "${root}" already exists.\nPlease choose a different parent directory or project name.`
    );
  }

  // Download files
  let starterAppPath = await _downloadStarterAppAsync(
    templateId,
    opts.progressFunction,
    opts.retryFunction
  );
  return { starterAppPath, name, root };
}

export async function extractTemplateApp(starterAppPath: string, name: string, root: string) {
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, MessageCode.EXTRACTING);
  await mkdirpAsync(root);
  await Extract.extractAsync(starterAppPath, root);

  // Update files
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, MessageCode.CUSTOMIZING);

  // Update app.json
  let appJson = await fs.readFile(path.join(root, 'app.json'), 'utf8');
  let customAppJson = appJson
    .replace(/\"My New Project\"/, `"${name}"`)
    .replace(/\"my-new-project\"/, `"${name}"`);
  await fs.writeFile(path.join(root, 'app.json'), customAppJson, 'utf8');

  await initGitRepo(root);

  return root;
}

async function initGitRepo(root: string) {
  if (process.platform === 'darwin' && !Binaries.isXcodeInstalled()) {
    Logger.global.warn(`Unable to initialize git repo. \`git\` not installed.`);
    return;
  }

  // let's see if we're in a git tree
  let insideGit = true;
  try {
    await spawnAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: root,
    });
    Logger.global.debug('New project is already inside of a git repo, skipping git init.');
  } catch (e) {
    insideGit = false;
  }

  if (!insideGit) {
    try {
      await spawnAsync('git', ['init'], { cwd: root });
    } catch (e) {
      // no-op -- this is just a convenience and we don't care if it fails
    }
  }
}

export async function saveRecentExpRootAsync(root: string) {
  root = path.resolve(root);

  // Write the recent Exps JSON file
  let recentExpsJsonFile = UserSettings.recentExpsJsonFile();
  let recentExps = await recentExpsJsonFile.readAsync();
  // Filter out copies of this so we don't get dupes in this list
  recentExps = recentExps.filter(function(x) {
    return x !== root;
  });
  recentExps.unshift(root);
  return await recentExpsJsonFile.writeAsync(recentExps.slice(0, 100));
}

function getHomeDir(): string {
  return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] || '';
}

function makePathReadable(pth) {
  let homedir = getHomeDir();
  if (pth.substr(0, homedir.length) === homedir) {
    return `~${pth.substr(homedir.length)}`;
  } else {
    return pth;
  }
}

export async function expInfoSafeAsync(root: string) {
  try {
    let { exp: { name, description, icon, iconUrl } } = await ProjectUtils.readConfigJsonAsync(
      root
    );
    let pathOrUrl =
      icon || iconUrl || 'https://d3lwq5rlu14cro.cloudfront.net/ExponentEmptyManifest_192.png';
    let resolvedPath = path.resolve(root, pathOrUrl);
    if (fs.existsSync(resolvedPath)) {
      icon = `file://${resolvedPath}`;
    } else {
      icon = pathOrUrl; // Assume already a URL
    }

    return {
      readableRoot: makePathReadable(root),
      root,
      name,
      description,
      icon,
    };
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
  },
};

// TODO: remove / change, no longer publishInfo, this is just used for signing
export async function getPublishInfoAsync(root: string): Promise<PublishInfo> {
  const user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Attempted to login in offline mode. This is a bug.');
  }

  const { username } = user;

  const { exp } = await ProjectUtils.readConfigJsonAsync(root);

  const name = exp.slug;
  const { version, sdkVersion } = exp;

  const configName = await ProjectUtils.configFilenameAsync(root);

  if (!sdkVersion) {
    throw new Error(`sdkVersion is missing from ${configName}`);
  }

  if (!name) {
    // slug is made programmatically for app.json
    throw new Error(`slug field is missing from exp.json.`);
  }

  if (!version) {
    throw new Error(`Can't get version of package.`);
  }

  const remotePackageName = name;
  const remoteUsername = username;
  const remoteFullPackageName = `@${remoteUsername}/${remotePackageName}`;
  const bundleIdentifierIOS = exp.ios ? exp.ios.bundleIdentifier : null;

  return {
    args: {
      username,
      remoteUsername,
      remotePackageName,
      remoteFullPackageName,
      bundleIdentifierIOS,
      sdkVersion,
    },
  };
}

export async function recentValidExpsAsync() {
  let recentExpsJsonFile = UserSettings.recentExpsJsonFile();
  let recentExps = await recentExpsJsonFile.readAsync();

  let results = await Promise.all(recentExps.map(expInfoSafeAsync));
  let filteredResults = results.filter(result => result);
  return filteredResults;
}

export async function sendAsync(recipient: string, url_: string, allowUnauthed: boolean = false) {
  let result = await Api.callMethodAsync('send', [recipient, url_, allowUnauthed]);
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
  ProjectSettings.setAsync(projectRoot, { urlRandomness: randomness });
  return randomness;
}

export async function clearXDLCacheAsync() {
  let dotExpoHomeDirectory = UserSettings.dotExpoHomeDirectory();
  rimraf.sync(path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache'));
  rimraf.sync(path.join(dotExpoHomeDirectory, 'android-apk-cache'));
  rimraf.sync(path.join(dotExpoHomeDirectory, 'starter-app-cache'));
  Logger.notifications.info(`Cleared cache`);
}
