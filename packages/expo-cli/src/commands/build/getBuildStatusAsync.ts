import { ApiV2, UserManager } from 'xdl';

import { getExpAsync, GetExpConfigOptions, validateOptions } from './startBuildAsync';

type JobState = 'pending' | 'started' | 'in-progress' | 'finished' | 'errored' | 'sent-to-queue';

export type TurtleMode = 'normal' | 'high' | 'high_only';

// https://github.com/expo/universe/blob/283efaba3acfdefdc7db12f649516b6d6a94bec4/server/www/src/data/entities/builds/BuildJobEntity.ts#L25-L56
export interface BuildJobFields {
  id: string;
  experienceName: string;
  status: JobState;
  platform: 'ios' | 'android';
  userId: string | null;
  experienceId: string;
  artifactId: string | null;
  nonce: string | null;
  artifacts: {
    url?: string;
    manifestPlistUrl?: string;
  } | null;
  config: {
    buildType?: string;
    releaseChannel?: string;
    bundleIdentifier?: string;
  };
  logs: object | null;
  extraData: {
    request_id?: string;
    turtleMode?: TurtleMode;
  } | null;
  created: Date;
  updated: Date;
  expirationDate: Date;
  sdkVersion: string | null;
  turtleVersion: string | null;
  buildDuration: number | null;
  priority: string;
  accountId: string | null;
}

export type BuildStatusResult = {
  jobs?: BuildJobFields[];
  err?: null;
  userHasBuiltAppBefore: boolean;
  userHasBuiltExperienceBefore: boolean;
  canPurchasePriorityBuilds?: boolean;
  numberOfRemainingPriorityBuilds?: number;
  hasUnlimitedPriorityBuilds?: boolean;
};

export async function getBuildStatusAsync(
  projectRoot: string,
  options: GetExpConfigOptions = {}
): Promise<BuildStatusResult> {
  const user = await UserManager.ensureLoggedInAsync();

  validateOptions(options);
  const { exp } = await getExpAsync(projectRoot, options);

  const api = ApiV2.clientForUser(user);
  return await api.postAsync('build/status', { manifest: exp, options });
}
