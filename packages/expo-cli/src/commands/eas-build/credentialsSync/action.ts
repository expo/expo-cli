import CommandError from '../../../CommandError';
import { Context } from '../../../credentials/context';
import * as credentialsJsonUpdateUtils from '../../../credentials/credentialsJson/update';
import { runCredentialsManager } from '../../../credentials/route';
import { SetupAndroidBuildCredentialsFromLocal } from '../../../credentials/views/SetupAndroidKeystore';
import { SetupIosBuildCredentialsFromLocal } from '../../../credentials/views/SetupIosBuildCredentials';
import log from '../../../log';
import prompts from '../../../prompts';
import { getBundleIdentifier } from '../build/utils/ios';
import { BuildCommandPlatform } from '../types';

interface Options {
  parent: {
    nonInteractive?: boolean;
  };
}

export default async function credentialsSyncAction(projectDir: string, options: Options) {
  if (options.parent.nonInteractive) {
    throw new CommandError('This command is not supported in --non-interactive mode');
  }
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
  if (update === 'local') {
    await updateLocalCredentialsAsync(projectDir, platform);
  } else {
    await updateRemoteCredentialsAsync(projectDir, platform);
  }
}

async function updateRemoteCredentialsAsync(
  projectDir: string,
  platform: BuildCommandPlatform
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);
  if (!ctx.hasProjectContext) {
    throw new Error('project context is required'); // should be checked earlier
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.ANDROID].includes(platform)) {
    const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
    await runCredentialsManager(ctx, new SetupAndroidBuildCredentialsFromLocal(experienceName));
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.IOS].includes(platform)) {
    const bundleIdentifier = await getBundleIdentifier(projectDir, ctx.manifest);
    const appLookupParams = {
      accountName: ctx.manifest.owner ?? ctx.user.username,
      projectName: ctx.manifest.slug,
      bundleIdentifier,
    };
    await runCredentialsManager(ctx, new SetupIosBuildCredentialsFromLocal(appLookupParams));
  }
}

export async function updateLocalCredentialsAsync(
  projectDir: string,
  platform: BuildCommandPlatform
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);
  if (!ctx.hasProjectContext) {
    throw new Error('project context is required'); // should be checked earlier
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.ANDROID].includes(platform)) {
    log('Updating Android credentials in credentials.json');
    await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
  }
  if ([BuildCommandPlatform.ALL, BuildCommandPlatform.IOS].includes(platform)) {
    const bundleIdentifier = await getBundleIdentifier(projectDir, ctx.manifest);
    log('Updating iOS credentials in credentials.json');
    await credentialsJsonUpdateUtils.updateIosCredentialsAsync(ctx, bundleIdentifier);
  }
}
