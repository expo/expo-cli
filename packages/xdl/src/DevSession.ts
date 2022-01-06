import { ExpoConfig } from '@expo/config-types';
import os from 'os';
import { URLSearchParams } from 'url';

import {
  ApiV2 as ApiV2Client,
  ConnectionStatus,
  Logger as logger,
  ProjectSettings,
  UrlUtils,
  UserManager,
} from './internal';

const UPDATE_FREQUENCY_SECS = 20;

let keepUpdating = true;

// TODO notify www when a project is started, and every N seconds afterwards
export async function startSession(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'name' | 'description' | 'slug' | 'primaryColor'>,
  platform: 'native' | 'web',
  forceUpdate: boolean = false
): Promise<void> {
  if (forceUpdate) {
    keepUpdating = true;
  }

  if (!ConnectionStatus.isOffline() && keepUpdating) {
    const authSession = await UserManager.getSessionAsync();
    const { devices } = await ProjectSettings.readDevicesInfoAsync(projectRoot);

    if (!authSession && !devices?.length) {
      // NOTE(brentvatne) let's just bail out in this case for now
      // throw new Error('development sessions can only be initiated for logged in users or with a device ID');
      return;
    }

    try {
      let url;
      if (platform === 'native') {
        url = await UrlUtils.constructDeepLinkAsync(projectRoot);
      } else if (platform === 'web') {
        url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      let queryString = '';
      if (devices) {
        const searchParams = new URLSearchParams();
        devices.forEach(device => {
          searchParams.append('deviceId', device.installationId);
        });
        queryString = `?${searchParams.toString()}`;
      }

      const apiClient = ApiV2Client.clientForUser(authSession);
      await apiClient.postAsync(`development-sessions/notify-alive${queryString}`, {
        data: {
          session: {
            description: `${exp.name} on ${os.hostname()}`,
            hostname: os.hostname(),
            platform,
            config: {
              // TODO: if icons are specified, upload a url for them too so people can distinguish
              description: exp.description,
              name: exp.name,
              slug: exp.slug,
              primaryColor: exp.primaryColor,
            },
            url,
            source: 'desktop',
          },
        },
      });
    } catch (e) {
      logger.global.debug(e, `Error updating dev session: ${e}`);
    }

    setTimeout(() => startSession(projectRoot, exp, platform), UPDATE_FREQUENCY_SECS * 1000);
  }
}

export function stopSession() {
  keepUpdating = false;
}
