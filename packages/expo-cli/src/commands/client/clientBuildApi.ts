import { ApiV2, RobotUser, User } from '@expo/api';
import { ExpoConfig } from '@expo/config';

export type ClientBuildRequestOptions = {
  user: User | RobotUser | null;
  appleTeamId?: string;
  appleContext: any;
  distributionCert: any;
  provisioningProfile: any;
  pushKey: any;
  udids: string[];
  addUdid: any;
  email: any;
  bundleIdentifier: string;
  customAppConfig: Partial<ExpoConfig>;
};

export async function createClientBuildRequest({
  user = null,
  appleContext,
  distributionCert,
  provisioningProfile,
  pushKey,
  udids,
  addUdid,
  email,
  bundleIdentifier,
  customAppConfig = {},
}: ClientBuildRequestOptions) {
  return await ApiV2.clientForUser(user).postAsync('client-build/create-ios-request', {
    appleTeamId: appleContext.team.id,
    appleTeamName: appleContext.team.name,
    addUdid,
    bundleIdentifier,
    email,
    customAppConfig: customAppConfig as any,
    credentials: {
      ...(pushKey && pushKey.apnsKeyP8 ? { apnsKeyP8: pushKey.apnsKeyP8 } : null),
      ...(pushKey && pushKey.apnsKeyId ? { apnsKeyId: pushKey.apnsKeyId } : null),
      certP12: distributionCert.certP12,
      certPassword: distributionCert.certPassword,
      provisioningProfileId: provisioningProfile.provisioningProfileId,
      provisioningProfile: provisioningProfile.provisioningProfile,
      teamId: appleContext.team.id,
      appleSession: appleContext.fastlaneSession,
      udidsString: JSON.stringify(udids),
    },
  });
}

export async function getExperienceName({
  user = null,
  appleTeamId,
}: Pick<ClientBuildRequestOptions, 'user' | 'appleTeamId'>): Promise<string> {
  const { experienceName } = await ApiV2.clientForUser(user).postAsync(
    'client-build/experience-name',
    {
      appleTeamId,
    }
  );
  return experienceName;
}

export async function isAllowedToBuild({
  user = null,
  appleTeamId,
}: Pick<ClientBuildRequestOptions, 'user' | 'appleTeamId'>) {
  return await ApiV2.clientForUser(user).postAsync('client-build/allowed-to-build', {
    appleTeamId,
  });
}
