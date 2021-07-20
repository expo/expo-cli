import {
  ExpoAppManifest,
  ExpoConfig,
  getConfig,
  PackageJSONConfig,
  ProjectTarget,
} from '@expo/config';

import { Env, ExponentTools, XDLError } from '../internal';

export type PublishOptions = {
  releaseChannel?: string;
  target?: ProjectTarget;
  resetCache?: boolean;
  maxWorkers?: number;
  quiet?: boolean;
};

export async function getPublishExpConfigAsync(
  projectRoot: string,
  options: Pick<PublishOptions, 'releaseChannel'>
): Promise<{
  exp: ExpoAppManifest;
  pkg: PackageJSONConfig;
  hooks: ExpoConfig['hooks'];
}> {
  if (options.releaseChannel != null && typeof options.releaseChannel !== 'string') {
    throw new XDLError('INVALID_OPTIONS', 'releaseChannel must be a string');
  }
  options.releaseChannel = options.releaseChannel || 'default';

  // Verify that exp/app.json and package.json exist
  const {
    exp: { hooks, runtimeVersion },
  } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const { exp, pkg } = getConfig(projectRoot, {
    isPublicConfig: true,
    // enforce sdk validation if user is not using runtimeVersion
    skipSDKVersionRequirement: !!runtimeVersion,
  });
  const { sdkVersion } = exp;
  // Only allow projects to be published with UNVERSIONED if a correct token is set in env
  if (sdkVersion === 'UNVERSIONED' && !Env.maySkipManifestValidation()) {
    throw new XDLError('INVALID_OPTIONS', 'Cannot publish with sdkVersion UNVERSIONED.');
  }
  exp.locales = await ExponentTools.getResolvedLocalesAsync(projectRoot, exp);
  return {
    exp: {
      ...exp,
      sdkVersion: sdkVersion!,
    },
    pkg,
    hooks,
  };
}
