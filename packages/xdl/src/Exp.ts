import { AppJSONConfig, BareAppConfig, getConfig } from '@expo/config';

import { getEntryPoint } from '@expo/config/paths';
import fs from 'fs-extra';
import merge from 'lodash/merge';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import JsonFile from '@expo/json-file';
import Minipass from 'minipass';
import pacote, { PackageSpec } from 'pacote';
import { Readable } from 'stream';
import tar, { ReadEntry } from 'tar';
import yaml from 'js-yaml';

import { NpmPackageManager, YarnPackageManager } from '@expo/package-manager';
import semver from 'semver';
import Api from './Api';
import ApiV2 from './ApiV2';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserManager from './User';
import * as UrlUtils from './UrlUtils';
import UserSettings from './UserSettings';
import * as ProjectSettings from './ProjectSettings';

const supportedPlatforms = ['ios', 'android', 'web'];

export function determineEntryPoint(projectRoot: string, platform?: string): string {
  if (platform && !supportedPlatforms.includes(platform)) {
    throw new Error(
      `Failed to resolve the project's entry file: The platform "${platform}" is not supported.`
    );
  }
  // TODO: Bacon: support platform extension resolution like .ios, .native
  // const platforms = [platform, 'native'].filter(Boolean) as string[];
  const platforms: string[] = [];

  const entry = getEntryPoint(projectRoot, ['./index'], platforms);
  if (!entry)
    throw new Error(
      `The project entry file could not be resolved. Please either define it in the \`package.json\` (main), \`app.json\` (expo.entryPoint), create an \`index.js\`, or install the \`expo\` package.`
    );

  return path.relative(projectRoot, entry);
}

function sanitizedName(name: string) {
  return name
    .replace(/[\W_]+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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
      .replace(/Hello App Display Name/g, this.config.name)
      .replace(/HelloWorld/g, sanitizedName(this.config.name))
      .replace(/helloworld/g, sanitizedName(this.config.name.toLowerCase()));
    super.write(replaced);
    return super.end();
  }
}

// Binary files, don't process these (avoid decoding as utf8)
const binaryExtensions = ['.png', '.jar', '.keystore'];

function createFileTransform(config: AppJSONConfig | BareAppConfig) {
  return function transformFile(entry: ReadEntry) {
    if (!binaryExtensions.includes(path.extname(entry.path)) && config.name) {
      return new Transformer(config);
    }
    return undefined;
  };
}

/**
 * Extract a template app to a given file path, initialize a git repo, install
 * npm dependencies, and log information about each of the steps.
 *
 * @deprecated - callers want to have more control over the logging around each
 * step, this is deprecated in favor of calling the methods that it is made up
 * of individually
 */
export async function extractAndInitializeTemplateApp(
  templateSpec: PackageSpec,
  projectRoot: string,
  packageManager: 'yarn' | 'npm' = 'npm',
  config: AppJSONConfig | BareAppConfig
) {
  Logger.notifications.warn(
    'extractAndInitializeTemplateApp is deprecated. Use extractAndPrepareTemplateAppAsync instead.'
  );
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, 'Extracting project files...');
  await extractAndPrepareTemplateAppAsync(templateSpec, projectRoot, config);
  Logger.notifications.info(
    { code: NotificationCode.PROGRESS },
    'Initializing a git repository...'
  );
  await initGitRepoAsync(projectRoot);
  Logger.notifications.info({ code: NotificationCode.PROGRESS }, 'Installing dependencies...');
  await installDependenciesAsync(projectRoot, packageManager);

  return projectRoot;
}

/**
 * Extract a template app to a given file path and clean up any properties left over from npm to
 * prepare it for usage.
 */
export async function extractAndPrepareTemplateAppAsync(
  templateSpec: PackageSpec,
  projectRoot: string,
  config: AppJSONConfig | BareAppConfig
) {
  await extractTemplateAppAsync(templateSpec, projectRoot, config);

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

  return projectRoot;
}

/**
 * Extract a template app to a given file path.
 */
export async function extractTemplateAppAsync(
  templateSpec: PackageSpec,
  targetPath: string,
  config: AppJSONConfig | BareAppConfig
) {
  await pacote.tarball.stream(
    templateSpec,
    tarStream => {
      return extractTemplateAppAsyncImpl(targetPath, config, tarStream);
    },
    {
      cache: path.join(UserSettings.dotExpoHomeDirectory(), 'template-cache'),
    }
  );

  return targetPath;
}

async function extractTemplateAppAsyncImpl(
  targetPath: string,
  config: AppJSONConfig | BareAppConfig,
  tarStream: Readable
) {
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
            .replace(
              /HelloWorld/g,
              entry.path.includes('android')
                ? sanitizedName(config.name.toLowerCase())
                : sanitizedName(config.name)
            )
            .replace(/helloworld/g, sanitizedName(config.name).toLowerCase());
        }
        if (entry.type && /^file$/i.test(entry.type) && path.basename(entry.path) === 'gitignore') {
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
}

export async function initGitRepoAsync(
  root: string,
  flags: { silent: boolean; commit: boolean } = { silent: false, commit: true }
) {
  // let's see if we're in a git tree
  try {
    await spawnAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: root,
    });
    !flags.silent &&
      Logger.global.debug('New project is already inside of a git repo, skipping git init.');
  } catch (e) {
    if (e.errno === 'ENOENT') {
      !flags.silent && Logger.global.warn('Unable to initialize git repo. `git` not in PATH.');
      return false;
    }
  }

  // not in git tree, so let's init
  try {
    await spawnAsync('git', ['init'], { cwd: root });
    !flags.silent && Logger.global.info('Initialized a git repository.');

    if (flags.commit) {
      await spawnAsync('git', ['add', '--all'], { cwd: root, stdio: 'ignore' });
      await spawnAsync('git', ['commit', '-m', 'Created a new Expo app'], {
        cwd: root,
        stdio: 'ignore',
      });
    }
    return true;
  } catch (e) {
    // no-op -- this is just a convenience and we don't care if it fails
    return false;
  }
}

export async function installDependenciesAsync(
  projectRoot: string,
  packageManager: 'yarn' | 'npm',
  flags: { silent: boolean } = { silent: false }
) {
  const options = { cwd: projectRoot, silent: flags.silent };
  if (packageManager === 'yarn') {
    const yarn = new YarnPackageManager(options);
    const version = await yarn.versionAsync();
    const nodeLinker = await yarn.getConfigAsync('nodeLinker');
    if (semver.satisfies(version, '>=2.0.0-rc.24') && nodeLinker !== 'node-modules') {
      const yarnRc = path.join(projectRoot, '.yarnrc.yml');
      let yamlString = '';
      try {
        yamlString = fs.readFileSync(yarnRc, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
      const config = yamlString ? yaml.safeLoad(yamlString) : {};
      config.nodeLinker = 'node-modules';
      !flags.silent &&
        Logger.global.warn(
          `Yarn v${version} detected, enabling experimental Yarn v2 support using the node-modules plugin.`
        );
      !flags.silent && Logger.global.info(`Writing ${yarnRc}...`);
      fs.writeFileSync(yarnRc, yaml.safeDump(config));
    }
    await yarn.installAsync();
  } else {
    await new NpmPackageManager(options).installAsync();
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

type PublishInfo = {
  args: {
    username: string;
    remoteUsername: string;
    remotePackageName: string;
    remoteFullPackageName: string;
    sdkVersion: string;
    iosBundleIdentifier?: string | null;
    androidPackage?: string | null;
  };
};

// TODO: remove / change, no longer publishInfo, this is just used for signing
export async function getPublishInfoAsync(root: string): Promise<PublishInfo> {
  const user = await UserManager.ensureLoggedInAsync();

  if (!user) {
    throw new Error('Attempted to login in offline mode. This is a bug.');
  }

  let { username } = user;

  // Evaluate the project config and throw an error if the `sdkVersion` cannot be found.
  const { exp } = getConfig(root);

  const name = exp.slug;
  const { version, sdkVersion } = exp;

  if (!name) {
    // slug is made programmatically for app.json
    throw new Error(
      `Cannot find the project's \`slug\`. Please add a \`name\` or \`slug\` field in the project's \`app.json\` or \`app.config.js\`). ex: \`"slug": "my-project"\``
    );
  }

  if (!version) {
    throw new Error(
      `Cannot find the project's \`version\`. Please define it in one of the project's config files: \`package.json\`, \`app.json\`, or \`app.config.js\`. ex: \`"version": "1.0.0"\``
    );
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
      sdkVersion: sdkVersion!,
      iosBundleIdentifier,
      androidPackage,
    },
  };
}

export async function sendAsync(recipient: string, url_: string, allowUnauthed: boolean = true) {
  let result;
  if (process.env.EXPO_LEGACY_API === 'true') {
    result = await Api.callMethodAsync('send', [recipient, url_, allowUnauthed]);
  } else {
    const user = await UserManager.ensureLoggedInAsync();
    const api = ApiV2.clientForUser(user);
    result = await api.postAsync('send-project', {
      emailOrPhone: recipient,
      url: url_,
      includeExpoLinks: allowUnauthed,
    });
  }
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
