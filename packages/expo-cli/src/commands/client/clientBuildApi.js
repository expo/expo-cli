import { ApiV2 } from '@expo/xdl';

async function createClientBuildRequest({
  user = null,
  context,
  distributionCert,
  provisioningProfile,
  pushKey,
  udids,
  addUdid,
  email,
  customAppConfig = {},
}) {
  return await ApiV2.clientForUser(user).postAsync('client-build/create-ios-request', {
    appleTeamId: context.team.id,
    appleTeamName: context.team.name,
    addUdid,
    bundleIdentifier: context.bundleIdentifier,
    email,
    customAppConfig,
    credentials: {
      ...(pushKey && pushKey.apnsKeyP8 ? { apnsKeyP8: pushKey.apnsKeyP8 } : null),
      ...(pushKey && pushKey.apnsKeyId ? { apnsKeyId: pushKey.apnsKeyId } : null),
      certP12: distributionCert.certP12,
      certPassword: distributionCert.certPassword,
      provisioningProfileId: provisioningProfile.provisioningProfileId,
      provisioningProfile: provisioningProfile.provisioningProfile,
      teamId: context.team.id,
      appleSession: context.fastlaneSession,
      udidsString: JSON.stringify(udids),
    },
  });
}

async function getExperienceName({ user = null, appleTeamId }) {
  const { experienceName } = await ApiV2.clientForUser(user).postAsync(
    'client-build/experience-name',
    {
      appleTeamId,
    }
  );
  return experienceName;
}

async function isAllowedToBuild({ user = null, appleTeamId }) {
  return await ApiV2.clientForUser(user).postAsync('client-build/allowed-to-build', {
    appleTeamId,
  });
}

export { createClientBuildRequest, getExperienceName, isAllowedToBuild };
