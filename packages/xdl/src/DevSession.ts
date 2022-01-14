import { Config, DevelopmentSessions, UserManager } from '@expo/api';
import { ExpoConfig } from '@expo/config-types';
import assert from 'assert';

import { Logger as logger, ProjectSettings, UrlUtils } from './internal';

const UPDATE_FREQUENCY_SECS = 20;

let keepUpdating = true;

async function getUrlForRuntimeAsync(projectRoot: string, runtime: string): Promise<string> {
  if (runtime === 'native') {
    return await UrlUtils.constructDeepLinkAsync(projectRoot);
  } else if (runtime === 'web') {
    const url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
    assert(url, `Webpack dev server is not running for project at: ${projectRoot}`);
    return url;
  }
  throw new Error(`Unsupported runtime: ${runtime}`);
}

// TODO notify www when a project is started, and every N seconds afterwards
export async function startSession(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'name' | 'description' | 'slug' | 'primaryColor'>,
  runtime: 'native' | 'web',
  forceUpdate: boolean = false
): Promise<void> {
  if (forceUpdate) {
    keepUpdating = true;
  }

  if (!Config.isOffline && keepUpdating) {
    const authSession = await UserManager.getSessionAsync();
    const { devices } = await ProjectSettings.getDevicesInfoAsync(projectRoot);

    if (!authSession && !devices?.length) {
      // NOTE(brentvatne) let's just bail out in this case for now
      // throw new Error('development sessions can only be initiated for logged in users or with a device ID');
      return;
    }

    try {
      const url = await getUrlForRuntimeAsync(projectRoot, runtime);

      await DevelopmentSessions.notifyAliveAsync(authSession, {
        source: 'desktop',
        exp,
        url,
        platform: runtime,
        devices,
      });
    } catch (e) {
      logger.global.debug(e, `Error updating dev session: ${e}`);
    }

    setTimeout(() => startSession(projectRoot, exp, runtime), UPDATE_FREQUENCY_SECS * 1000);
  }
}

export function stopSession() {
  keepUpdating = false;
}
