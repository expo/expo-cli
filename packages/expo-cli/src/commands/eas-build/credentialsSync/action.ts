import { getConfig } from '@expo/config';
import { UserManager } from '@expo/xdl';
import { v4 as uuidv4 } from 'uuid';

import CommandError from '../../../CommandError';
import { Context } from '../../../credentials/context';
import * as credentialsJsonUpdateUtils from '../../../credentials/credentialsJson/update';
import { runCredentialsManager } from '../../../credentials/route';
import { SetupAndroidBuildCredentialsFromLocal } from '../../../credentials/views/SetupAndroidKeystore';
import { SetupIosBuildCredentialsFromLocal } from '../../../credentials/views/SetupIosBuildCredentials';
import log from '../../../log';
import { ensureProjectExistsAsync } from '../../../projects';
import prompts from '../../../prompts';
import { getBundleIdentifier } from '../build/utils/ios';
import { AnalyticsEvent, BuildCommandPlatform, TrackingContext } from '../types';
import Analytics from '../utils/analytics';

interface Options {
  parent: {
    nonInteractive?: boolean;
  };
}

export default async function credentialsSyncAction(projectDir: string, options: Options) {
  if (options.parent.nonInteractive) {
    throw new CommandError('This command is not supported in --non-interactive mode');
  }
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true });

  const accountName = exp.owner || user.username;
  const projectName = exp.slug;

  const projectId = await ensureProjectExistsAsync(user, {
    accountName,
    projectName,
  });

  const { update, platform } = await prompts([
    {
      type: 'select',
      name: 'update',
      message: 'What do you want to do?',
      choices: [
        {
          title: 'Update credentials on the Expo servers with the local credentials.json contents',
          value: 'remote',
        },
        {
          title: 'Update or create local credentials.json with credentials from the Expo servers',
          value: 'local',
        },
      ],
    },
    {
      type: 'select',
      name: 'platform',
      message: 'Which platform would you like to update?',
      choices: [
        { title: 'Android', value: BuildCommandPlatform.ANDROID },
        { title: 'iOS', value: BuildCommandPlatform.IOS },
        { title: 'both', value: BuildCommandPlatform.ALL },
      ],
    },
  ]);

  const trackingCtx = {
    tracking_id: uuidv4(),
    project_id: projectId,
    account_name: accountName,
    project_name: projectName,
    request_platform: platform,
  };
  Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_COMMAND, trackingCtx);
  if (update === 'local') {
    await updateLocalCredentialsAsync(projectDir, platform, trackingCtx);
  } else {
    await updateRemoteCredentialsAsync(projectDir, platform, trackingCtx);
  }
}

async function updateRemoteCredentialsAsync(
  projectDir: string,
  platform: BuildCommandPlatform,
  trackingCtx: TrackingContext
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);
  if (!ctx.hasProjectContext) {
    throw new Error('project context is required'); // should be checked earlier
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.ANDROID].includes(platform)) {
    try {
      const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
      await runCredentialsManager(
        ctx,
        new SetupAndroidBuildCredentialsFromLocal(experienceName, { skipKeystoreValidation: false })
      );
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_REMOTE_SUCCESS, {
        ...trackingCtx,
        platform: 'android',
      });
    } catch (error) {
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_REMOTE_FAIL, {
        ...trackingCtx,
        platform: 'android',
        reason: error.message,
      });
      throw error;
    }
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.IOS].includes(platform)) {
    try {
      const bundleIdentifier = await getBundleIdentifier(projectDir, ctx.manifest);
      const appLookupParams = {
        accountName: ctx.manifest.owner ?? ctx.user.username,
        projectName: ctx.manifest.slug,
        bundleIdentifier,
      };
      await runCredentialsManager(ctx, new SetupIosBuildCredentialsFromLocal(appLookupParams));
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_REMOTE_SUCCESS, {
        ...trackingCtx,
        platform: 'ios',
      });
    } catch (error) {
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_REMOTE_FAIL, {
        ...trackingCtx,
        platform: 'ios',
        reason: error.message,
      });
      throw error;
    }
  }
}

export async function updateLocalCredentialsAsync(
  projectDir: string,
  platform: BuildCommandPlatform,
  trackingCtx: TrackingContext
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);
  if (!ctx.hasProjectContext) {
    throw new Error('project context is required'); // should be checked earlier
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.ANDROID].includes(platform)) {
    try {
      log('Updating Android credentials in credentials.json');
      await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_LOCAL_SUCCESS, {
        ...trackingCtx,
        platform: 'android',
      });
    } catch (error) {
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_LOCAL_FAIL, {
        ...trackingCtx,
        platform: 'android',
        reason: error.message,
      });
      throw error;
    }
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.IOS].includes(platform)) {
    try {
      const bundleIdentifier = await getBundleIdentifier(projectDir, ctx.manifest);
      log('Updating iOS credentials in credentials.json');
      await credentialsJsonUpdateUtils.updateIosCredentialsAsync(ctx, bundleIdentifier);
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_REMOTE_SUCCESS, {
        ...trackingCtx,
        platform: 'android',
      });
    } catch (error) {
      Analytics.logEvent(AnalyticsEvent.CREDENTIALS_SYNC_UPDATE_REMOTE_FAIL, {
        ...trackingCtx,
        platform: 'ios',
        reason: error.message,
      });
      throw error;
    }
  }
}
