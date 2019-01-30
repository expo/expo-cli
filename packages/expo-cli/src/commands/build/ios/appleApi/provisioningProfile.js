import { runAction, travelingFastlane } from './fastlane';

const createManager = ({ appleId, appleIdPassword, team, bundleIdentifier }) => ({
  async create(metadata) {
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
  async revoke() {
    const args = ['revoke', appleId, appleIdPassword, team.id, team.inHouse, bundleIdentifier];
    await runAction(travelingFastlane.manageProvisioningProfiles, args);
  },
});

export default createManager;
