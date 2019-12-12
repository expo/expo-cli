import * as ConfigUtils from '@expo/config';
import { Versions } from '@expo/xdl';
import { findProjectRootAsync } from './ProjectUtils';

export async function getExpoSdkConfig(path: string) {
  try {
    const { projectRoot } = await findProjectRootAsync(path);
    const { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot);
    return exp;
  } catch (error) {
    if (error.code !== 'NO_PROJECT') {
      throw error;
    }
  }
  return undefined;
}

type ClientPlatform = 'android' | 'ios';

export function getClient(sdk: Versions.SDKVersion, platform: ClientPlatform) {
  if (platform === 'android' && sdk.androidClientUrl) {
    return {
      url: sdk.androidClientUrl,
      version: sdk.androidClientVersion,
    };
  }

  if (platform === 'ios' && sdk.iosClientUrl) {
    return {
      url: sdk.iosClientUrl,
      version: sdk.iosClientVersion,
    };
  }

  return undefined;
}

interface AvailableClientOptions {
  sdkVersions: Versions.SDKVersions;
  platform: ClientPlatform;
  project?: ConfigUtils.ExpoConfig;
}

export function getAvailableClients(options: AvailableClientOptions) {
  return Object.keys(options.sdkVersions)
    .reverse()
    .map(version => {
      const client = getClient(options.sdkVersions[version], options.platform);

      return {
        sdkVersionString: version,
        sdkVersion: options.sdkVersions[version],
        clientUrl: client ? client.url : undefined,
        clientVersion: client ? client.version : undefined,
      };
    })
    .filter(client => {
      const hasUrl = !!client.clientUrl;
      const isDeprecated = !!client.sdkVersion.isDeprecated;
      const IsCompatible = options.project
        ? Versions.lteSdkVersion(options.project, client.sdkVersionString)
        : true;

      return !isDeprecated && IsCompatible && hasUrl;
    });
}
