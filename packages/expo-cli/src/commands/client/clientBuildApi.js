import { ApiV2 } from 'xdl';

async function createClientBuildRequest({
  user = null,
  context,
  distributionCert,
  pushKey,
  udids,
  addUdid,
  email,
}) {
  return await ApiV2.clientForUser(user).postAsync('client-build/create-ios-request', {
    appleTeamId: context.team.id,
    appleTeamName: context.team.name,
    addUdid,
    bundleIdentifier: context.bundleIdentifier,
    email,
    credentials: {
      apnsKeyP8: pushKey.apnsKeyP8,
      apnsKeyId: pushKey.apnsKeyId,
      certP12: distributionCert.certP12,
      certPassword: distributionCert.certPassword,
      teamId: context.team.id,
      appleSession: context.fastlaneSession,
      udids,
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

export { createClientBuildRequest, getExperienceName };
