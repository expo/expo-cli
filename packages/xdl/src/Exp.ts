import * as ConfigUtils from '@expo/config';
import { AppJSONConfig, BareAppConfig } from '@expo/config';
import fs from 'fs-extra';
import merge from 'lodash/merge';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import JsonFile from '@expo/json-file';
import Minipass from 'minipass';
import pacote, { PackageSpec } from 'pacote';
import tar from 'tar';

import Api from './Api';
import * as Binaries from './Binaries';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as ThirdParty from './ThirdParty';
import UserManager from './User';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import * as ProjectSettings from './ProjectSettings';

// FIXME(perry) eliminate usage of this template
export const ENTRY_POINT_PLATFORM_TEMPLATE_STRING = 'PLATFORM_GOES_HERE';

// TODO(ville): update when this has landed: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/36598
type ReadEntry = any;

export async function determineEntryPointAsync(root: string) {
  let { exp, pkg } = await ConfigUtils.readConfigJsonAsync(root);

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

class Transformer extends Minipass {
  data: string;
  config: AppJSONConfig | BareAppConfig;

  constructor(config: AppJSONConfig | BareAppConfig) {
    super();
    this.data = '';
    this.config = config;
  }
  write(data: string) {
    this.data += data;
    return true;
  }
  end() {
    let replaced = this.data
      .replace(/Hello App Display Name/g, this.config.displayName || this.config.name)
      .replace(/HelloWorld/g, this.config.name)
      .replace(/helloworld/g, this.config.name.toLowerCase());
    super.write(replaced);
    return super.end();
  }
}

// Binary files, don't process these (avoid decoding as utf8)
const binaryExtensions = ['.png', '.jar'];

function createFileTransform(config: AppJSONConfig | BareAppConfig) {
  return function transformFile(entry: ReadEntry) {
    if (!binaryExtensions.includes(path.extname(entry.path)) && config.name) {
      return new Transformer(config);
    }
    return;
  };
}

export async function extractAndInitializeTemplateApp(
  templateSpec: PackageSpec,
  projectRoot: string,
  packageManager: 'yarn' | 'npm' = 'npm',
  config: AppJSONConfig | BareAppConfig
) {
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, 'Extracting project files...');
  await extractTemplateAppAsync(templateSpec, projectRoot, config);

  // Update files
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, 'Customizing project...');

  let appFile = new JsonFile(path.join(projectRoot, 'app.json'));
  let appJson = merge(await appFile.readAsync(), config);
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

  await initGitRepoAsync(projectRoot);
  await installDependenciesAsync(projectRoot, packageManager);

  return projectRoot;
}

export async function extractTemplateAppAsync(
  templateSpec: PackageSpec,
  targetPath: string,
  config: AppJSONConfig | BareAppConfig
) {
  let tarStream = await pacote.tarball.stream(templateSpec, {
    cache: path.join(UserSettings.dotExpoHomeDirectory(), 'template-cache'),
  });
  await fs.mkdirp(targetPath);
  await new Promise((resolve, reject) => {
    const extractStream = tar.x({
      cwd: targetPath,
      strip: 1,
      // TODO(ville): pending https://github.com/DefinitelyTyped/DefinitelyTyped/pull/36598
      // @ts-ignore property missing from the type definition
      transform: createFileTransform(config),
      onentry(entry: ReadEntry) {
        if (config.name) {
          // Rewrite paths for bare workflow
          entry.path = entry.path
            .replace(/HelloWorld/g, config.name)
            .replace(/helloworld/g, config.name.toLowerCase());
        }
        if (/^file$/i.test(entry.type) && path.basename(entry.path) === 'gitignore') {
          // Rename `gitignore` because npm ignores files named `.gitignore` when publishing.
          // See: https://github.com/npm/npm/issues/1862
          entry.path = entry.path.replace(/gitignore$/, '.gitignore');
        }
      },
    });
    tarStream.on('error', reject);
    extractStream.on('error', reject);
    extractStream.on('close', resolve);
    tarStream.pipe(extractStream);
  });

  return targetPath;
}

async function initGitRepoAsync(root: string) {
  // let's see if we're in a git tree
  let insideGit = true;
  try {
    await spawnAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: root,
    });
    Logger.global.debug('New project is already inside of a git repo, skipping git init.');
  } catch (e) {
    if (e.errno == 'ENOENT') {
      Logger.global.warn('Unable to initialize git repo. `git` not in PATH.');
    }
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

async function installDependenciesAsync(projectRoot: string, packageManager: 'yarn' | 'npm') {
  Logger.global.info('Installing dependencies...');

  if (packageManager === 'yarn') {
    await spawnAsync('yarnpkg', ['install'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } else {
    await spawnAsync('npm', ['install'], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  }
}

export async function saveRecentExpRootAsync(root: string) {
  root = path.resolve(root);

  // Write the recent Exps JSON file
  const recentExpsJsonFile = UserSettings.recentExpsJsonFile();
  let recentExps = await recentExpsJsonFile.readAsync();
  // Filter out copies of this so we don't get dupes in this list
  recentExps = recentExps.filter((dir: string) => dir !== root);
  recentExps.unshift(root);
  return await recentExpsJsonFile.writeAsync(recentExps.slice(0, 100));
}

function getHomeDir(): string {
  return process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'] || '';
}

function makePathReadable(pth: string) {
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
    } = await ConfigUtils.readConfigJsonAsync(root);
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
    username: string;
    remoteUsername: string;
    remotePackageName: string;
    remoteFullPackageName: string;
    sdkVersion: string;
    iosBundleIdentifier?: string;
    androidPackage?: string;
  };
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

  const iosBundleIdentifier = exp.ios ? exp.ios.bundleIdentifier : null;
  const androidPackage = exp.android ? exp.android.package : null;
  return {
    args: {
      username,
      remoteUsername: username,
      remotePackageName: slug,
      remoteFullPackageName: `@${username}/${slug}`,
      sdkVersion,
      iosBundleIdentifier,
      androidPackage,
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

  const { exp } = await ConfigUtils.readConfigJsonAsync(root);

  const name = exp.slug;
  const { version, sdkVersion } = exp;

  const configName = await ConfigUtils.configFilenameAsync(root);

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
  const iosBundleIdentifier = exp.ios ? exp.ios.bundleIdentifier : null;
  const androidPackage = exp.android ? exp.android.package : null;

  return {
    args: {
      username,
      remoteUsername,
      remotePackageName,
      remoteFullPackageName,
      sdkVersion,
      iosBundleIdentifier,
      androidPackage,
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
  fs.removeSync(path.join(dotExpoHomeDirectory, 'ios-simulator-app-cache'));
  fs.removeSync(path.join(dotExpoHomeDirectory, 'android-apk-cache'));
  fs.removeSync(path.join(dotExpoHomeDirectory, 'starter-app-cache'));
  Logger.notifications.info(`Cleared cache`);
}
