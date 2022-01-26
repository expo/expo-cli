import { getConfig } from '@expo/config';
import { ExpoConfig } from '@expo/config-types';
import chalk from 'chalk';
import { Versions } from 'xdl';

import prompt from '../../utils/prompts';
import { findProjectRootAsync } from './ProjectUtils';

export async function getExpoSdkConfig(path: string) {
  try {
    const { projectRoot } = await findProjectRootAsync(path);
    const { exp } = getConfig(projectRoot, {
      skipSDKVersionRequirement: true,
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

export function getClient(platform: ClientPlatform, sdk?: Versions.SDKVersion | null) {
  if (!sdk) {
    return null;
  }

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

  return null;
}

interface AvailableClientOptions {
  sdkVersions: Versions.SDKVersions;
  platform: ClientPlatform;
  project?: ExpoConfig;
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
      const client = getClient(options.platform, options.sdkVersions[version]);

      return {
        sdkVersionString: version,
        sdkVersion: options.sdkVersions[version],
        clientUrl: client?.url,
        clientVersion: client?.version,
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
    type: 'select',
    name: 'targetClient',
    message: 'Choose an SDK version to install the client for:',
    optionsPerPage: 20,
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
        title: `${chalk.bold(client.sdkVersionString)} ${chalk.gray(clientMessage)}`,
      };
    }),
  });

  return answer.targetClient;
}
