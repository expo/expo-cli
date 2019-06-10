import ora from 'ora';
import { runAction, travelingFastlane } from '../build/ios/appleApi/fastlane';
import { tagForUpdate } from './tagger';
import log from '../../log';

// XXX: workaround for https://github.com/babel/babel/issues/6262
export default selectAdhocProvisioningProfile;

async function selectAdhocProvisioningProfile(context, udids, distCertSerialNumber, options = {}) {
  const spinner = ora(`Handling Adhoc provisioning profiles on Apple Developer Portal...`).start();
  const args = [
    '--apple-id',
    context.appleId,
    '--apple-password',
    context.appleIdPassword,
    context.team.id,
    udids,
    context.bundleIdentifier,
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
