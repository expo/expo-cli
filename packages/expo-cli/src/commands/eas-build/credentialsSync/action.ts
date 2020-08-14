import CommandError from '../../../CommandError';
import { Context } from '../../../credentials/context';
import { updateLocalCredentialsJsonAsync } from '../../../credentials/local';
import { runCredentialsManager } from '../../../credentials/route';
import { SetupAndroidBuildCredentialsFromLocal } from '../../../credentials/views/SetupAndroidKeystore';
import { SetupIosBuildCredentialsFromLocal } from '../../../credentials/views/SetupIosBuildCredentials';
import prompts from '../../../prompts';
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
          title: 'Update credentials on Expo servers with local credentials.json content',
          value: 'remote',
        },
        { title: 'Update local credentials.json with values from Expo servers', value: 'local' },
      ],
    },
    {
      type: 'select',
      name: 'platform',
      message: 'Do you want to update credentials for both platforms?',
      choices: [
        { title: 'Android & iOS', value: BuildCommandPlatform.ALL },
        { title: 'only Android', value: BuildCommandPlatform.ANDROID },
        { title: 'only iOS', value: BuildCommandPlatform.IOS },
      ],
    },
  ]);
  if (update === 'local') {
    await updateLocalCredentialsJsonAsync(projectDir, platform);
  } else {
    await updateRemoteCredentialsAsync(projectDir, platform);
  }
}

async function updateRemoteCredentialsAsync(projectDir: string, platform: BuildCommandPlatform) {
  const ctx = new Context();
  await ctx.init(projectDir);
  if (!ctx.hasProjectContext) {
    throw new Error('project context is required'); // should bb checked earlier
  }
  if (['all', 'android'].includes(platform)) {
    const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
    await runCredentialsManager(ctx, new SetupAndroidBuildCredentialsFromLocal(experienceName));
  }
  if (['all', 'ios'].includes(platform)) {
    const bundleIdentifier = ctx.manifest.ios?.bundleIdentifier;
    if (!bundleIdentifier) {
      throw new Error('"expo.ios.bundleIdentifier" field is required in your app.json');
    }
    const appLookupParams = {
      accountName: ctx.manifest.owner ?? ctx.user.username,
      projectName: ctx.manifest.slug,
      bundleIdentifier,
    };
    await runCredentialsManager(ctx, new SetupIosBuildCredentialsFromLocal(appLookupParams));
  }
}
