import { ApiV2 } from 'xdl';

export default async function createClientBuildRequest({
  user = null,
  context,
  distributionCert,
  udids,
  addUdid,
  email,
}) {
  return await ApiV2.clientForUser(user).postAsync('client-build/create-ios-request', {
    appleSession: context.fastlaneSession,
    appleTeamId: context.team.id,
    appleTeamName: context.team.name,
    addUdid,
    bundleIdentifier: context.bundleIdentifier,
    email,
    credentials: {
      certP12: distributionCert.certP12,
      certPassword: distributionCert.certPassword,
      teamId: context.team.id,
      appleSession: context.fastlaneSession,
      udids,
    },
  });
}
