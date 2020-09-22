import { configFilename, getConfig } from '@expo/config';
import joi from '@hapi/joi';
import slug from 'slugify';

import Analytics from './Analytics';
import ApiV2 from './ApiV2';
import Config from './Config';
import * as ThirdParty from './ThirdParty';
import UserManager from './User';
import XDLError from './XDLError';
import { assertValidProjectRoot } from './project/ProjectUtils';

type JobState = 'pending' | 'started' | 'in-progress' | 'finished' | 'errored' | 'sent-to-queue';

type TurtleMode = 'normal' | 'high' | 'high_only';

interface BuildJobConfig {
  buildType?: string;
  releaseChannel?: string;
  bundleIdentifier?: string;
}

enum BuildJobPriority {
  HIGH = 'high',
  NORMAL = 'normal',
}

// https://github.com/expo/universe/blob/283efaba3acfdefdc7db12f649516b6d6a94bec4/server/www/src/data/entities/builds/BuildJobEntity.ts#L25-L56
export interface BuildJobFields {
  id: string;
  experienceName: string;
  status: JobState;
  platform: 'ios' | 'android';
  userId: string | null;
  experienceId: string;
  artifactId: string | null;
  nonce: string | null;
  artifacts: {
    url?: string;
    manifestPlistUrl?: string;
  } | null;
  config: BuildJobConfig;
  logs: object | null;
  extraData: {
    request_id?: string;
    turtleMode?: TurtleMode;
  } | null;
  created: Date;
  updated: Date;
  expirationDate: Date;
  sdkVersion: string | null;
  turtleVersion: string | null;
  buildDuration: number | null;
  priority: BuildJobPriority;
  accountId: string | null;
}

type BuildStatusResult = {
  jobs: BuildJobFields[];
  err: null;
  userHasBuiltAppBefore: boolean;
  userHasBuiltExperienceBefore: boolean;
  canPurchasePriorityBuilds: boolean;
  numberOfRemainingPriorityBuilds: number;
  hasUnlimitedPriorityBuilds: boolean;
};

type BuildCreatedResult = {
  id: string;
  ids: string[];
  priority: 'normal' | 'high';
  canPurchasePriorityBuilds: boolean;
  numberOfRemainingPriorityBuilds: number;
  hasUnlimitedPriorityBuilds: boolean;
};

type GetExpConfigOptions = {
  current?: boolean;
  mode?: string;
  platform?: 'android' | 'ios' | 'all';
  expIds?: string[];
  type?: string;
  releaseChannel?: string;
  bundleIdentifier?: string;
  publicUrl?: string;
  sdkVersion?: string;
};

async function getConfigAsync(
  projectRoot: string,
  options: Pick<GetExpConfigOptions, 'publicUrl' | 'platform'> = {}
) {
  if (!options.publicUrl) {
    // get the manifest from the project directory
    const { exp, pkg } = getConfig(projectRoot);
    const configName = configFilename(projectRoot);
    return {
      exp,
      pkg,
      configName: configFilename(projectRoot),
      configPrefix: configName === 'app.json' ? 'expo.' : '',
    };
  } else {
    // get the externally hosted manifest
    return {
      exp: await ThirdParty.getManifest(options.publicUrl, options),
      configName: options.publicUrl,
      configPrefix: '',
      pkg: {},
    };
  }
}

function _validateManifest(options: any, exp: any, configName: string, configPrefix: string) {
  if (options.platform === 'ios' || options.platform === 'all') {
    if (!exp.ios || !exp.ios.bundleIdentifier) {
      throw new XDLError(
        'INVALID_MANIFEST',
        `Must specify a bundle identifier in order to build this experience for iOS. ` +
          `Please specify one in ${configName} at "${configPrefix}ios.bundleIdentifier"`
      );
    }
  }

  if (options.platform === 'android' || options.platform === 'all') {
    if (!exp.android || !exp.android.package) {
      throw new XDLError(
        'INVALID_MANIFEST',
        `Must specify a java package in order to build this experience for Android. ` +
          `Please specify one in ${configName} at "${configPrefix}android.package"`
      );
    }
  }
}
function _validateOptions(options: any) {
  const schema = joi.object().keys({
    current: joi.boolean(),
    mode: joi.string(),
    platform: joi.any().valid('ios', 'android', 'all'),
    expIds: joi.array(),
    type: joi.any().valid('archive', 'simulator', 'client', 'app-bundle', 'apk'),
    releaseChannel: joi.string().regex(/[a-z\d][a-z\d._-]*/),
    bundleIdentifier: joi.string().regex(/^[a-zA-Z][a-zA-Z0-9\-.]+$/),
    publicUrl: joi.string(),
    sdkVersion: joi.string().strict(),
  });

  const { error } = schema.validate(options);
  if (error) {
    throw new XDLError('INVALID_OPTIONS', error.toString());
  }
}

async function _getExpAsync(
  projectRoot: string,
  options: Pick<GetExpConfigOptions, 'publicUrl' | 'mode' | 'platform'>
) {
  const { exp, pkg, configName, configPrefix } = await getConfigAsync(projectRoot, options);

  if (!exp || !pkg) {
    throw new XDLError(
      'NO_PACKAGE_JSON',
      `Couldn't read ${configName} file in project at ${projectRoot}`
    );
  }

  // Support version and name being specified in package.json for legacy
  // support pre: exp.json
  if (!exp.version && 'version' in pkg && pkg.version) {
    exp.version = pkg.version;
  }
  if (!exp.name && 'name' in pkg && typeof pkg.name === 'string') {
    exp.name = pkg.name;
  }
  if (!exp.slug && typeof exp.name === 'string') {
    exp.slug = slug(exp.name.toLowerCase());
  }
  return { exp, configName, configPrefix };
}

export async function getBuildStatusAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildStatusResult> {
  const user = await UserManager.ensureLoggedInAsync();

  assertValidProjectRoot(projectRoot);
  _validateOptions(options);
  const { exp } = await _getExpAsync(projectRoot, options);

  const api = ApiV2.clientForUser(user);
  return await api.postAsync('build/status', { manifest: exp, options });
}

export async function startBuildAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildCreatedResult> {
  const user = await UserManager.ensureLoggedInAsync();

  assertValidProjectRoot(projectRoot);
  _validateOptions(options);
  const { exp, configName, configPrefix } = await _getExpAsync(projectRoot, options);
  _validateManifest(options, exp, configName, configPrefix);

  Analytics.logEvent('Build Shell App', {
    projectRoot,
    developerTool: Config.developerTool,
    platform: options.platform,
  });

  const api = ApiV2.clientForUser(user);
  return await api.putAsync('build/start', { manifest: exp, options });
}

export async function findReusableBuildAsync(
  releaseChannel: string,
  platform: string,
  sdkVersion: string,
  slug: string
): Promise<{ downloadUrl?: string; canReuse: boolean }> {
  const user = await UserManager.getCurrentUserAsync();

  const buildReuseStatus = await ApiV2.clientForUser(user).postAsync('standalone-build/reuse', {
    releaseChannel,
    platform,
    sdkVersion,
    slug,
  });

  return buildReuseStatus;
}
