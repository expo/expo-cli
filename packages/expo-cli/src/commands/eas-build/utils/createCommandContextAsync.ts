import { getConfig } from '@expo/config';
import { User, UserManager } from '@expo/xdl';

import { BuildCommandPlatform, CommandContext } from '../types';

export default async function createCommandContextAsync({
  requestedPlatform,
  profile,
  projectDir,
  nonInteractive = false,
  skipCredentialsCheck = false,
  skipProjectConfiguration = false,
}: {
  requestedPlatform: BuildCommandPlatform;
  profile: string;
  projectDir: string;
  nonInteractive?: boolean;
  skipCredentialsCheck?: boolean;
  skipProjectConfiguration?: boolean;
}): Promise<CommandContext> {
  const user: User = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true });
  const accountName = exp.owner || user.username;
  const projectName = exp.slug;

  return {
    requestedPlatform,
    profile,
    projectDir,
    user,
    accountName,
    projectName,
    exp,
    nonInteractive,
    skipCredentialsCheck,
    skipProjectConfiguration,
  };
}
