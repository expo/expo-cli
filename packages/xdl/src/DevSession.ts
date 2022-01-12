import { ConnectionStatus, UserManager } from '@expo/api';
import { ExpoConfig } from '@expo/config-types';

import { Logger as logger, UrlUtils } from './internal';

const UPDATE_FREQUENCY_SECS = 20;

let keepUpdating = true;

async function getUrlForRuntimeAsync(projectRoot: string, runtime: string) {
  if (runtime === 'native') {
    return UrlUtils.constructDeepLinkAsync(projectRoot);
  } else if (runtime === 'web') {
    return UrlUtils.constructWebAppUrlAsync(projectRoot);
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

  if (!ConnectionStatus.isOffline() && keepUpdating) {
    // TODO(anp) if the user has configured device ids, then notify for those too
    const authSession = await UserManager.getSessionAsync();

    if (!authSession) {
      // NOTE(brentvatne) let's just bail out in this case for now
      // throw new Error('development sessions can only be initiated for logged in users');
      return;
    }

    try {
      const url = await getUrlForRuntimeAsync(projectRoot, runtime);

      await UserManager.notifyAliveAsync(authSession, {
        source: 'desktop',
        exp,
        url,
        platform: runtime,
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
