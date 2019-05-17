import { runAction, travelingFastlane } from './fastlane';

const createManager = ({ appleId, appleIdPassword, team }) => ({
  async create(bundleIdentifier, metadata) {
    const args = [
      'create',
      appleId,
      appleIdPassword,
      team.id,
      team.inHouse,
      bundleIdentifier,
      metadata.distCertSerialNumber || '__last__',
    ];
    return await runAction(travelingFastlane.manageProvisioningProfiles, args);
  },
  async revoke(bundleIdentifier) {
    const args = ['revoke', appleId, appleIdPassword, team.id, team.inHouse, bundleIdentifier];
    await runAction(travelingFastlane.manageProvisioningProfiles, args);
  },
});

export default createManager;
