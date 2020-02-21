import * as ConfigUtils from '@expo/config';
import { Versions } from '@expo/xdl';
import chalk from 'chalk';
import prompt from '../../prompt';
import { findProjectRootAsync } from './ProjectUtils';

export async function getExpoSdkConfig(path: string) {
  try {
    const { projectRoot } = await findProjectRootAsync(path);
    const { exp } = ConfigUtils.getConfig(projectRoot, {
      skipSDKVersionRequirement: true,
      mode: 'production',
    });
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

interface AvailableClient {
  sdkVersion: Versions.SDKVersion;
  sdkVersionString: string;
  clientUrl?: string;
  clientVersion?: string;
}

export function getAvailableClients(options: AvailableClientOptions): AvailableClient[] {
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

interface InstallClientOptions {
  clients: AvailableClient[];
  latestSdkVersion?: string;
  currentSdkVersion?: string;
}

export async function askClientToInstall(options: InstallClientOptions): Promise<AvailableClient> {
  const answer = await prompt({
    type: 'list',
    name: 'targetClient',
    message: 'Choose an SDK version to install the client for:',
    pageSize: 20,
    choices: options.clients.map(client => {
      const clientVersion = `- client ${client.clientVersion || 'version unknown'}`;
      const clientLabels = [
        client.sdkVersionString === options.latestSdkVersion && 'latest',
        client.sdkVersionString === options.currentSdkVersion && 'recommended',
      ].filter(Boolean);

      const clientMessage = clientLabels.length
        ? `${clientVersion} (${clientLabels.join(', ')})`
        : clientVersion;

      return {
        value: client,
        name: `${chalk.bold(client.sdkVersionString)} ${chalk.gray(clientMessage)}`,
      };
    }),
  });

  return answer.targetClient;
}
