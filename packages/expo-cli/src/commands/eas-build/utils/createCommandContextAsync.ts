import { getConfig } from '@expo/config';
import { UserManager } from '@expo/xdl';

import { getProjectOwner } from '../../../projects';
import { BuildCommandPlatform, CommandContext, TrackingContext } from '../types';

export default async function createCommandContextAsync({
  requestedPlatform,
  profile,
  projectDir,
  trackingCtx,
  nonInteractive = false,
  skipCredentialsCheck = false,
  skipProjectConfiguration = false,
}: {
  requestedPlatform: BuildCommandPlatform;
  profile: string;
  projectDir: string;
  trackingCtx: TrackingContext;
  nonInteractive?: boolean;
  skipCredentialsCheck?: boolean;
  skipProjectConfiguration?: boolean;
}): Promise<CommandContext> {
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true });
  const accountName = getProjectOwner(user, exp);
  const projectName = exp.slug;

  return {
    requestedPlatform,
    profile,
    projectDir,
    user,
    accountName,
    projectName,
    exp,
    trackingCtx,
    nonInteractive,
    skipCredentialsCheck,
    skipProjectConfiguration,
  };
}
