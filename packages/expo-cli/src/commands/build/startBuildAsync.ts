import { configFilename, getConfig } from '@expo/config';
import joi from '@hapi/joi';
import slug from 'slugify';
import { Analytics, ApiV2, Config, ThirdParty, UserManager, XDLError } from 'xdl';

export type BuildCreatedResult = {
  id: string;
  ids: string[];
  priority: 'normal' | 'high';
  canPurchasePriorityBuilds: boolean;
  numberOfRemainingPriorityBuilds: number;
  hasUnlimitedPriorityBuilds: boolean;
};

export type GetExpConfigOptions = {
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

export function validateOptions(options: any) {
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

export async function getExpAsync(
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

export async function startBuildAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildCreatedResult> {
  const user = await UserManager.ensureLoggedInAsync();

  validateOptions(options);
  const { exp, configName, configPrefix } = await getExpAsync(projectRoot, options);
  validateManifest(options, exp, configName, configPrefix);

  Analytics.logEvent('Build Shell App', {
    projectRoot,
    developerTool: Config.developerTool,
    platform: options.platform,
  });

  const api = ApiV2.clientForUser(user);
  return await api.putAsync('build/start', { manifest: exp, options });
}

function validateManifest(options: any, exp: any, configName: string, configPrefix: string) {
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
