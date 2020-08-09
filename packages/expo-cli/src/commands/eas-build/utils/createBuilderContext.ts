import { Platform } from '@expo/build-tools';

import { EasConfig } from '../../../easJson';
import { BuilderContext, CommandContext, PlatformBuildProfile } from '../types';

export default function createBuilderContext<T extends Platform>({
  platform,
  easConfig,
  commandCtx,
}: {
  platform: T;
  easConfig: EasConfig;
  commandCtx: CommandContext;
}): BuilderContext<T> {
  const buildProfile = easConfig.builds[platform] as PlatformBuildProfile<T> | undefined;
  if (!buildProfile) {
    throw new Error(`${platform} build profile does not exist`);
  }

  return {
    commandCtx,
    platform,
    buildProfile,
  };
}
