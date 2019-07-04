import os from 'os';

import ApiV2Client from './ApiV2';
import Config from './Config';
import logger from './Logger';
import * as UrlUtils from './UrlUtils';
import UserManager from './User';

const UPDATE_FREQUENCY_SECS = 20;

let keepUpdating = true;

// TODO notify www when a project is started, and every N seconds afterwards
export async function startSession(
  projectRoot: string,
  exp: any,
  platform: 'native' | 'web',
  forceUpdate: boolean = false
): Promise<void> {
  if (forceUpdate) {
    keepUpdating = true;
  }

  if (!Config.offline && keepUpdating) {
    // TODO(anp) if the user has configured device ids, then notify for those too
    let authSession = await UserManager.getSessionAsync();

    if (!authSession) {
      // NOTE(brentvatne) let's just bail out in this case for now
      // throw new Error('development sessions can only be initiated for logged in users');
      return;
    }

    try {
      let url;
      if (platform === 'native') {
        url = await UrlUtils.constructManifestUrlAsync(projectRoot);
      } else if (platform === 'web') {
        url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      let apiClient = ApiV2Client.clientForUser(authSession);
      await apiClient.postAsync('development-sessions/notify-alive', {
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
