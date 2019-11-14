import ora from 'ora';

import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import { tagForUpdate } from './tagger';

export default async function selectAdhocProvisioningProfile(
  context,
  udids,
  bundleIdentifier,
  distCertSerialNumber,
  options = {}
) {
  const spinner = ora(`Handling Adhoc provisioning profiles on Apple Developer Portal...`).start();
  const args = [
    '--apple-id',
    context.appleId,
    '--apple-password',
    context.appleIdPassword,
    context.team.id,
    udids,
    bundleIdentifier,
    distCertSerialNumber,
  ];
  const adhocProvisioningProfile = await runAction(
    travelingFastlane.manageAdHocProvisioningProfile,
    args
  );

  const {
    provisioningProfileUpdateTimestamp,
    provisioningProfileCreateTimestamp,
    provisioningProfileName,
  } = adhocProvisioningProfile;
  if (provisioningProfileCreateTimestamp) {
    spinner.succeed(`Created new profile: ${provisioningProfileName}`);
  } else if (provisioningProfileUpdateTimestamp) {
    spinner.succeed(`Updated existing profile: ${provisioningProfileName}`);
  } else {
    spinner.succeed(`Used existing profile: ${provisioningProfileName}`);
  }

  // tag for updating to Expo servers
  tagForUpdate(adhocProvisioningProfile);

  return adhocProvisioningProfile;
}
