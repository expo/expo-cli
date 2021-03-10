import { getConfig } from '@expo/config';
import { compileModsAsync } from '@expo/config-plugins';
import { CodeSigningSettings, withCodeSigning } from '@expo/config-plugins/build/ios/CodeSigning';
import { UserManager } from '@expo/xdl';

import { AppleCtx, ensureBundleIdExistsAsync } from '../../appleApi';

export async function configureCodeSigningAsync(projectRoot: string, auth: AppleCtx) {
  // let config: ExpoConfig;
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  config = withCodeSigning(config, {
    isAutoSigning: true,
    isDevelopment: true,
    appleTeamId: auth.team.id,
  });

  // compile all plugins and mods
  config = await compileModsAsync(config, { projectRoot, platforms: ['ios'] });

  const bundleId = config.ios?.bundleIdentifier!;
  await ensureBundleIdExistsAsync(
    auth,
    {
      accountName: (await UserManager.getCurrentUsernameAsync())!,
      // Xcode format is like: 'XC com bacon yolo5' ours is like 'EX com bacon yolo5'
      projectName: ['EX', ...(bundleId.split('.') || [])].join(' '),
      bundleIdentifier: bundleId,
    },
    { enablePushNotifications: true }
  );
}
