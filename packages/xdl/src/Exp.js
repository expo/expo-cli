/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import JsonFile from '@expo/json-file';
import rimraf from 'rimraf';
import pacote from 'pacote';

import * as Analytics from './Analytics';
import Api from './Api';
import * as Binaries from './Binaries';
import ErrorCode from './ErrorCode';
import * as Extract from './Extract';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as ProjectUtils from './project/ProjectUtils';
import * as ThirdParty from './ThirdParty';
import UserManager from './User';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import XDLError from './XDLError';
import * as ProjectSettings from './ProjectSettings';
import MessageCode from './MessageCode';

// FIXME(perry) eliminate usage of this template
export const ENTRY_POINT_PLATFORM_TEMPLATE_STRING = 'PLATFORM_GOES_HERE';

export { default as convertProjectAsync } from './project/Convert';

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

export async function extractTemplateApp(
  templateSpec: string | object,
  name: string,
  projectRoot: string,
  packageManager: 'yarn' | 'npm' = 'npm'
) {
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, MessageCode.EXTRACTING);
  await pacote.extract(templateSpec, projectRoot, {
    cache: path.join(UserSettings.dotExpoHomeDirectory(), 'template-cache'),
  });

  // Update files
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, MessageCode.CUSTOMIZING);

  let appFile = new JsonFile(path.join(projectRoot, 'app.json'));
  let appJson = await appFile.readAsync();
  appJson = {
    ...appJson,
    expo: { ...appJson.expo, name, slug: name },
  };
  await appFile.writeAsync(appJson);

  let packageFile = new JsonFile(path.join(projectRoot, 'package.json'));
  let packageJson = await packageFile.readAsync();
  // Adding `private` stops npm from complaining about missing `name` and `version` fields.
  // We don't add a `name` field because it also exists in `app.json`.
  packageJson = { ...packageJson, private: true };
  // These are metadata fields related to the template package, let's remove them from the package.json.
  delete packageJson.name;
  delete packageJson.version;
  delete packageJson.description;
  delete packageJson.tags;
  delete packageJson.repository;
  // pacote adds these, but we don't want them in the package.json of the project.
  delete packageJson._resolved;
  delete packageJson._integrity;
  delete packageJson._from;
  await packageFile.writeAsync(packageJson);

  // Rename `gitignore` because npm ignores files named `.gitignore` when publishing.
  // See: https://github.com/npm/npm/issues/1862
  try {
    await fs.move(path.join(projectRoot, 'gitignore'), path.join(projectRoot, '.gitignore'));
  } catch (error) {
    // Append, if there's already a `.gitignore` file there
    if (error.code === 'EEXIST') {
      let data = fs.readFileSync(path.join(projectRoot, 'gitignore'));
      fs.appendFileSync(path.join(projectRoot, '.gitignore'), data);
      fs.unlinkSync(path.join(projectRoot, 'gitignore'));
    } else if (error.code === 'ENOENT') {
      // `gitignore` doesn't exist, move on.
    } else {
      throw error;
    }
  }

  await initGitRepo(projectRoot);

  await installDependencies(projectRoot, packageManager);

  return projectRoot;
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
      Logger.global.info('Initialized a git repository.');
    } catch (e) {
      // no-op -- this is just a convenience and we don't care if it fails
    }
  }
}

async function installDependencies(projectRoot, packageManager) {
  Logger.global.info('Installing dependencies...');

  if (packageManager === 'yarn') {
    await spawnAsync('yarnpkg', ['install', '--silent'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } else {
    await spawnAsync('npm', ['install', '--silent'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
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
    let {
      exp: { name, description, icon, iconUrl },
    } = await ProjectUtils.readConfigJsonAsync(root);
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

export async function getThirdPartyInfoAsync(publicUrl: string): Promise<PublishInfo> {
  const user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Attempted to login in offline mode. This is a bug.');
  }

  const { username } = user;

  const exp = await ThirdParty.getManifest(publicUrl);
  const { slug, sdkVersion, version } = exp;
  if (!sdkVersion) {
    throw new Error(`sdkVersion is missing from ${publicUrl}`);
  }

  if (!slug) {
    // slug is made programmatically for app.json
    throw new Error(`slug field is missing from exp.json.`);
  }

  if (!version) {
    throw new Error(`Can't get version of package.`);
  }

  const bundleIdentifierIOS = exp.ios ? exp.ios.bundleIdentifier : null;
  return {
    args: {
      username,
      remoteUsername: username,
      remotePackageName: slug,
      remoteFullPackageName: `@${username}/${slug}`,
      bundleIdentifierIOS,
      sdkVersion,
    },
  };
}

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

export async function sendAsync(recipient: string, url_: string, allowUnauthed: boolean = true) {
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
