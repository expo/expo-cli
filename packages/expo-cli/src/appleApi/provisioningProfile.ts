import { Profile, ProfileType, RequestContext } from '@expo/apple-utils';

import CommandError from '../CommandError';
import { ora } from '../utils/ora';
import { findP12CertSerialNumber } from '../utils/p12Certificate';
import { AppleCtx, getRequestContext } from './authenticate';
import { getBundleIdForIdentifierAsync, getProfilesForBundleIdAsync } from './bundleId';
import {
  DistCert,
  DistCertInfo,
  getCertificateBySerialNumberAsync,
  transformCertificate,
} from './distributionCert';

export type ProvisioningProfileInfo = {
  name: string;
  status: string;
  expires: number;
  distributionMethod: string;
  certificates: DistCertInfo[];
} & ProvisioningProfile;

export type ProvisioningProfile = {
  provisioningProfileId?: string;
  provisioningProfile: string;
  teamId: string;
  teamName?: string;
};

export enum ProfileClass {
  Adhoc = 'ad_hoc',
  General = 'general',
}

function resolveProfileType(profileClass: ProfileClass, isEnterprise?: boolean): ProfileType {
  if (isEnterprise) {
    return profileClass === ProfileClass.Adhoc
      ? ProfileType.IOS_APP_ADHOC
      : ProfileType.IOS_APP_INHOUSE;
  } else {
    return profileClass === ProfileClass.Adhoc
      ? ProfileType.IOS_APP_ADHOC
      : ProfileType.IOS_APP_STORE;
  }
}

async function transformProfileAsync(
  cert: Profile,
  authCtx: AppleCtx
): Promise<ProvisioningProfileInfo> {
  return {
    provisioningProfileId: cert.id,
    name: cert.attributes.name,
    status: cert.attributes.profileState,
    expires: new Date(cert.attributes.expirationDate).getTime() / 1000,
    distributionMethod: cert.attributes.profileType,
    // @ts-ignore -- this can be null when the profile has expired.
    provisioningProfile: cert.attributes.profileContent,
    certificates: (await cert.getCertificatesAsync()).map(transformCertificate),
    teamId: authCtx.team.id,
    teamName: authCtx.team.name,
  };
}

async function addCertificateToProfileAsync(
  context: RequestContext,
  {
    serialNumber,
    profileId,
    bundleIdentifier,
  }: {
    serialNumber: string;
    profileId: string;
    bundleIdentifier: string;
  }
) {
  const cert = await getCertificateBySerialNumberAsync(context, serialNumber);

  const profiles = await getProfilesForBundleIdAsync(context, bundleIdentifier);
  const profile = profiles.find(profile => profile.id === profileId);
  if (!profile) {
    throw new CommandError(
      `Failed to find profile for bundle identifier "${bundleIdentifier}" with profile id "${profileId}"`
    );
  }

  // Assign the new certificate
  profile.attributes.certificates = [cert];
  return await profile.regenerateAsync();
}

async function useExistingProvisioningProfileAsync(
  authCtx: AppleCtx,
  bundleIdentifier: string,
  provisioningProfile: ProvisioningProfile,
  distCert: DistCert
): Promise<ProvisioningProfile> {
  if (!provisioningProfile.provisioningProfileId) {
    throw new CommandError('Provisioning profile: cannot use existing profile, insufficient id');
  }
  const certIdTag = distCert.certId ? ` (${distCert.certId})` : '';

  const spinner = ora(
    `Updating provisioning profile (${provisioningProfile.provisioningProfileId}) with distribution certificate${certIdTag}`
  ).start();
  try {
    if (!distCert.distCertSerialNumber) {
      distCert.distCertSerialNumber = findP12CertSerialNumber(
        distCert.certP12,
        distCert.certPassword
      );
    }

    const context = getRequestContext(authCtx);
    const profile = await addCertificateToProfileAsync(context, {
      serialNumber: distCert.distCertSerialNumber,
      profileId: provisioningProfile.provisioningProfileId,
      bundleIdentifier,
    });
    const content = profile.attributes.profileContent;
    if (!content) {
      // this should never happen because of the regen.
      throw new CommandError(
        `Provisioning profile "${profile.attributes.name}" (${profile.id}) is expired!`
      );
    }
    const result = {
      provisioningProfileId: profile.id,
      provisioningProfile: content,
      teamId: authCtx.team.id,
      teamName: authCtx.team.name,
    };
    spinner.succeed(
      `Updated provisioning profile (${profile.id}) with distribution certificate${certIdTag}`
    );
    return {
      ...result,
      teamId: authCtx.team.id,
      teamName: authCtx.team.name,
    };
  } catch (error) {
    spinner.fail(
      `Failed to update provisioning profile (${provisioningProfile.provisioningProfileId}) with distribution certificate${certIdTag}`
    );
    throw error;
  }
}

async function listProvisioningProfilesAsync(
  authCtx: AppleCtx,
  bundleIdentifier: string,
  profileClass: ProfileClass = ProfileClass.General
): Promise<ProvisioningProfileInfo[]> {
  const spinner = ora(`Fetching Apple provisioning profiles`).start();
  try {
    const context = getRequestContext(authCtx);
    const profileType = resolveProfileType(profileClass, authCtx.team.inHouse);
    const profiles = (await getProfilesForBundleIdAsync(context, bundleIdentifier)).filter(
      profile => profile.attributes.profileType === profileType
    );

    const result = await Promise.all(
      profiles.map(profile => transformProfileAsync(profile, authCtx))
    );

    spinner.succeed(`Fetched Apple provisioning profiles`);
    return result;
  } catch (error) {
    spinner.fail(`Failed to fetch Apple provisioning profiles`);
    throw error;
  }
}

async function createProvisioningProfileAsync(
  authCtx: AppleCtx,
  bundleIdentifier: string,
  distCert: DistCert,
  profileName: string,
  profileClass: ProfileClass = ProfileClass.General
): Promise<ProvisioningProfile> {
  const spinner = ora(`Creating Apple provisioning profile`).start();
  try {
    if (!distCert.distCertSerialNumber) {
      distCert.distCertSerialNumber = findP12CertSerialNumber(
        distCert.certP12,
        distCert.certPassword
      );
    }

    const context = getRequestContext(authCtx);
    const profileType = resolveProfileType(profileClass, authCtx.team.inHouse);

    const certificate = await getCertificateBySerialNumberAsync(
      context,
      distCert.distCertSerialNumber
    );

    const bundleIdItem = await getBundleIdForIdentifierAsync(context, bundleIdentifier);

    const profile = await Profile.createAsync(context, {
      bundleId: bundleIdItem.id,
      name: profileName,
      certificates: [certificate.id],
      devices: [],
      profileType,
    });

    const result = await transformProfileAsync(profile, authCtx);

    spinner.succeed('Created Apple provisioning profile');
    return result;
  } catch (error) {
    spinner.fail('Failed to create Apple provisioning profile');
    throw error;
  }
}

async function revokeProvisioningProfileAsync(
  authCtx: AppleCtx,
  bundleIdentifier: string,
  profileClass: ProfileClass = ProfileClass.General
): Promise<void> {
  const spinner = ora(`Revoking Apple provisioning profile`).start();
  try {
    const context = getRequestContext(authCtx);

    const profiles = await getProfilesForBundleIdAsync(context, bundleIdentifier);
    const profileType = resolveProfileType(profileClass, authCtx.team.inHouse);
    await Promise.all(
      profiles
        .filter(profile => profile.attributes.profileType === profileType)
        .map(profile => Profile.deleteAsync(context, { id: profile.id }))
    );
    spinner.succeed('Revoked Apple provisioning profile');
  } catch (error) {
    spinner.fail('Failed to revoke Apple provisioning profile');
    throw error;
  }
}

export class ProvisioningProfileManager {
  constructor(public ctx: AppleCtx) {}

  async useExisting<T extends DistCert>(
    bundleIdentifier: string,
    provisioningProfile: ProvisioningProfile,
    distCert: T
  ): Promise<ProvisioningProfile> {
    return useExistingProvisioningProfileAsync(
      this.ctx,
      bundleIdentifier,
      provisioningProfile,
      distCert
    );
  }

  async list(bundleIdentifier: string): Promise<ProvisioningProfileInfo[]> {
    return listProvisioningProfilesAsync(this.ctx, bundleIdentifier);
  }

  async create<T extends DistCert>(
    bundleIdentifier: string,
    distCert: T,
    profileName: string
  ): Promise<ProvisioningProfile> {
    return createProvisioningProfileAsync(this.ctx, bundleIdentifier, distCert, profileName);
  }

  async revoke(bundleIdentifier: string) {
    return revokeProvisioningProfileAsync(this.ctx, bundleIdentifier);
  }
}
