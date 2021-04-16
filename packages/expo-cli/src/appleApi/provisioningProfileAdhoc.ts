import { Device, Profile, ProfileState, ProfileType, RequestContext } from '@expo/apple-utils';

import CommandError from '../CommandError';
import { ora } from '../utils/ora';
import { AppleCtx, getRequestContext } from './authenticate';
import { getBundleIdForIdentifierAsync, getProfilesForBundleIdAsync } from './bundleId';
import { getDistributionCertificateAync } from './distributionCert';
import { ProvisioningProfile } from './provisioningProfile';

interface ProfileResults {
  didUpdate?: boolean;
  didCreate?: boolean;
  profileName?: string;
  provisioningProfileId: string;
  provisioningProfile: any;
}

function uniqueItems<T = any>(items: T[]): T[] {
  const set = new Set(items);
  return [...set];
}

async function registerMissingDevicesAsync(
  context: RequestContext,
  udids: string[]
): Promise<Device[]> {
  const allIosProfileDevices = await Device.getAllIOSProfileDevicesAsync(context);
  const alreadyAdded = allIosProfileDevices.filter(device =>
    udids.includes(device.attributes.udid)
  );
  const alreadyAddedUdids = alreadyAdded.map(i => i.attributes.udid);

  await Promise.all(
    udids.map(async udid => {
      if (!alreadyAddedUdids.includes(udid)) {
        const device = await Device.createAsync(context, {
          name: 'iOS Device (added by Expo)',
          udid,
        });
        alreadyAdded.push(device);
      }
    })
  );

  return alreadyAdded;
}

async function findProfileByBundleIdAsync(
  context: RequestContext,
  bundleId: string,
  certSerialNumber: string
): Promise<{
  profile: Profile | null;
  didUpdate: boolean;
}> {
  const expoProfiles = (await getProfilesForBundleIdAsync(context, bundleId)).filter(profile => {
    return (
      profile.attributes.profileType === ProfileType.IOS_APP_ADHOC &&
      profile.attributes.name.startsWith('*[expo]') &&
      profile.attributes.profileState !== ProfileState.EXPIRED
    );
  });

  const expoProfilesWithCertificate: Profile[] = [];
  // find profiles associated with our development cert
  for (const profile of expoProfiles) {
    const certificates = await profile.getCertificatesAsync();
    if (certificates.some(cert => cert.attributes.serialNumber === certSerialNumber)) {
      expoProfilesWithCertificate.push(profile);
    }
  }

  if (expoProfilesWithCertificate) {
    // there is an expo managed profile with our desired certificate
    // return the profile that will be valid for the longest duration
    return {
      profile: expoProfilesWithCertificate.sort(sortByExpiration)[
        expoProfilesWithCertificate.length - 1
      ],
      didUpdate: false,
    };
  } else if (expoProfiles) {
    // there is an expo managed profile, but it doesn't have our desired certificate
    // append the certificate and update the profile
    const distributionCertificate = await getDistributionCertificateAync(context, certSerialNumber);
    if (!distributionCertificate) {
      throw new CommandError(`Certificate for serial number "${certSerialNumber}" does not exist`);
    }
    const profile = expoProfiles.sort(sortByExpiration)[expoProfiles.length - 1];
    profile.attributes.certificates = [distributionCertificate];
    return { profile: await profile.regenerateAsync(), didUpdate: true };
  }

  // there is no valid provisioning profile available
  return { profile: null, didUpdate: false };
}

function sortByExpiration(a: Profile, b: Profile): number {
  return (
    new Date(a.attributes.expirationDate).getTime() -
    new Date(b.attributes.expirationDate).getTime()
  );
}

async function findProfileByIdAsync(
  context: RequestContext,
  profileId: string,
  bundleId: string
): Promise<Profile | null> {
  let profiles = await getProfilesForBundleIdAsync(context, bundleId);
  profiles = profiles.filter(
    profile => profile.attributes.profileType === ProfileType.IOS_APP_ADHOC
  );
  return profiles.find(profile => profile.id === profileId) ?? null;
}

async function manageAdHocProfilesAsync(
  context: RequestContext,
  {
    udids,
    bundleId,
    certSerialNumber,
    profileId,
  }: {
    udids: string[];
    bundleId: string;
    certSerialNumber: string;
    profileId?: string;
  }
): Promise<ProfileResults> {
  // We register all missing devices on the Apple Developer Portal. They are identified by UDIDs.
  const devices = await registerMissingDevicesAsync(context, udids);

  let existingProfile: Profile | null;
  let didUpdate = false;

  if (profileId) {
    existingProfile = await findProfileByIdAsync(context, profileId, bundleId);
    // Fail if we cannot find the profile that was specifically requested
    if (!existingProfile)
      throw new CommandError(
        `Could not find profile with profile id "${profileId}" for bundle id "${bundleId}"`
      );
  } else {
    // If no profile id is passed, try to find a suitable provisioning profile for the App ID.
    const results = await findProfileByBundleIdAsync(context, bundleId, certSerialNumber);
    existingProfile = results.profile;
    didUpdate = results.didUpdate;
  }

  if (existingProfile) {
    // We need to verify whether the existing profile includes all user's devices.
    let deviceUdidsInProfile =
      existingProfile?.attributes?.devices?.map?.(i => i.attributes.udid) ?? [];
    deviceUdidsInProfile = uniqueItems(deviceUdidsInProfile.filter(Boolean));
    const allDeviceUdids = uniqueItems(udids);
    const hasEqualUdids =
      deviceUdidsInProfile.length === allDeviceUdids.length &&
      deviceUdidsInProfile.every(udid => allDeviceUdids.includes(udid));
    if (hasEqualUdids && existingProfile.isValid()) {
      const result: ProfileResults = {
        profileName: existingProfile?.attributes?.name,
        provisioningProfileId: existingProfile?.id,
        provisioningProfile: existingProfile?.attributes.profileContent,
      };
      if (didUpdate) {
        result.didUpdate = true;
      }

      return result;
    }
    // We need to add new devices to the list and create a new provisioning profile.
    existingProfile.attributes.devices = devices;
    await existingProfile.regenerateAsync();

    const updatedProfile = (await findProfileByBundleIdAsync(context, bundleId, certSerialNumber))
      .profile;
    if (!updatedProfile) {
      throw new CommandError(
        `Failed to locate updated profile for bundle identifier "${bundleId}" and serial number "${certSerialNumber}"`
      );
    }
    return {
      didUpdate: true,
      profileName: updatedProfile.attributes.name,
      provisioningProfileId: updatedProfile.id,
      provisioningProfile: updatedProfile.attributes.profileContent,
    };
  }

  // No existing profile...

  // We need to find user's distribution certificate to make a provisioning profile for it.
  const distributionCertificate = await getDistributionCertificateAync(context, certSerialNumber);

  if (!distributionCertificate) {
    // If the distribution certificate doesn't exist, the user must have deleted it, we can't do anything here :(
    throw new CommandError(
      `No distribution certificate for serial number "${certSerialNumber}" is available to make a provisioning profile against`
    );
  }
  const bundleIdItem = await getBundleIdForIdentifierAsync(context, bundleId);
  // If the provisioning profile for the App ID doesn't exist, we just need to create a new one!
  const newProfile = await Profile.createAsync(context, {
    bundleId: bundleIdItem.id,
    // apple drops [ if its the first char (!!),
    name: `*[expo] ${bundleId} AdHoc ${Date.now()}`,
    certificates: [distributionCertificate.id],
    devices: devices.map(device => device.id),
    profileType: ProfileType.IOS_APP_ADHOC,
  });

  return {
    didUpdate: true,
    didCreate: true,
    profileName: newProfile.attributes.name,
    provisioningProfileId: newProfile.id,
    provisioningProfile: newProfile.attributes.profileContent,
  };
}

async function createOrReuseAdhocProvisioningProfileAsync(
  authCtx: AppleCtx,
  udids: string[],
  bundleIdentifier: string,
  distCertSerialNumber: string
): Promise<ProvisioningProfile> {
  const spinner = ora(`Handling Apple ad hoc provisioning profiles`).start();
  try {
    const context = getRequestContext(authCtx);
    const {
      didUpdate,
      didCreate,
      profileName,
      ...adhocProvisioningProfile
    } = await manageAdHocProfilesAsync(context, {
      udids,
      bundleId: bundleIdentifier,
      certSerialNumber: distCertSerialNumber,
    });

    if (didCreate) {
      spinner.succeed(`Created new profile: ${profileName}`);
    } else if (didUpdate) {
      spinner.succeed(`Updated existing profile: ${profileName}`);
    } else {
      spinner.succeed(`Used existing profile: ${profileName}`);
    }

    return {
      ...adhocProvisioningProfile,
      teamId: authCtx.team.id,
      teamName: authCtx.team.name,
    };
  } catch (error) {
    spinner.fail(`Failed to handle Apple profiles`);
    throw error;
  }
}

export class ProvisioningProfileAdhocManager {
  constructor(public ctx: AppleCtx) {}

  async createOrReuse(
    udids: string[],
    bundleIdentifier: string,
    distCertSerialNumber: string
  ): Promise<ProvisioningProfile> {
    return createOrReuseAdhocProvisioningProfileAsync(
      this.ctx,
      udids,
      bundleIdentifier,
      distCertSerialNumber
    );
  }
}
