import chalk from 'chalk';
import fs from 'fs-extra';
import find from 'lodash/find';
import ora from 'ora';
import every from 'lodash/every';
import plist, { PlistObject } from '@expo/plist';
import { IosCodeSigning, PKCS12Utils } from '@expo/xdl';
import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView } from '../context';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  appleTeamSchema,
  provisioningProfileSchema,
} from '../credentials';
import { askForUserProvided, getCredentialsFromUser } from '../actions/promptForCredentials';
import { displayIosAppCredentials } from '../actions/list';
import {
  AppleCtx,
  DistCert,
  ProvisioningProfile,
  ProvisioningProfileInfo,
  ProvisioningProfileManager,
} from '../../appleApi';

export type ProvisioningProfileOptions = {
  experienceName: string;
  bundleIdentifier: string;
  distCert: DistCert;
};

export class RemoveProvisioningProfile implements IView {
  shouldRevoke: boolean;
  nonInteractive: boolean;

  constructor(shouldRevoke: boolean = false, nonInteractive: boolean = false) {
    this.shouldRevoke = shouldRevoke;
    this.nonInteractive = nonInteractive;
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectProfileFromExpo(ctx.ios.credentials);
    if (selected) {
      await this.removeSpecific(ctx, selected);
      log(
        chalk.green(
          `Successfully removed Provisioning Profile for ${selected.experienceName} (${selected.bundleIdentifier})`
        )
      );
    }
    return null;
  }

  async removeSpecific(ctx: Context, selected: IosAppCredentials) {
    log('Removing Provisioning Profile...\n');
    await ctx.ios.deleteProvisioningProfile(selected.experienceName, selected.bundleIdentifier);

    let shouldRevoke = this.shouldRevoke;
    if (!shouldRevoke && !this.nonInteractive) {
      const { revoke } = await prompt([
        {
          type: 'confirm',
          name: 'revoke',
          message: 'Do you also want to revoke it on Apple Developer Portal?',
        },
      ]);
      shouldRevoke = revoke;
    }

    if (shouldRevoke) {
      await ctx.ensureAppleCtx();
      const ppManager = new ProvisioningProfileManager(ctx.appleCtx);
      await ppManager.revoke(selected.bundleIdentifier);
    }
  }
}

export class CreateProvisioningProfile implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _distCert: DistCert;

  constructor(options: ProvisioningProfileOptions) {
    const { experienceName, bundleIdentifier, distCert } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._distCert = distCert;
  }

  async create(ctx: Context): Promise<ProvisioningProfile> {
    const provisioningProfile = await this.provideOrGenerate(ctx);
    const appleTeam = ctx.hasAppleCtx()
      ? ctx.appleCtx.team
      : await getCredentialsFromUser(appleTeamSchema);
    if (!appleTeam) {
      throw new Error('Must provide a valid Apple Team Id');
    }
    return await ctx.ios.updateProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier,
      provisioningProfile,
      appleTeam
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    await this.create(ctx);

    log(chalk.green('Successfully created Provisioning Profile\n'));
    const appCredentials = find(
      ctx.ios.credentials.appCredentials,
      app =>
        app.experienceName === this._experienceName &&
        app.bundleIdentifier === this._bundleIdentifier
    )!;
    displayIosAppCredentials(appCredentials);
    log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<ProvisioningProfile> {
    const userProvided = await askForUserProvided(provisioningProfileSchema);
    if (userProvided) {
      // userProvided profiles don't come with ProvisioningProfileId's (only accessible from Apple Portal API)
      log(chalk.yellow('Provisioning profile: Unable to validate uploaded profile.'));
      return userProvided;
    }
    return await generateProvisioningProfile(ctx, this._bundleIdentifier, this._distCert);
  }
}

export class UseExistingProvisioningProfile implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _distCert: DistCert;

  constructor(options: ProvisioningProfileOptions) {
    const { experienceName, bundleIdentifier, distCert } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._distCert = distCert;
  }

  async open(ctx: Context): Promise<IView | null> {
    await ctx.ensureAppleCtx();
    const selected = await selectProfileFromApple(ctx.appleCtx, this._bundleIdentifier);
    if (selected) {
      await configureAndUpdateProvisioningProfile(
        ctx,
        this._experienceName,
        this._bundleIdentifier,
        this._distCert,
        selected
      );
    }
    return null;
  }
}

export class CreateOrReuseProvisioningProfile implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _distCert: DistCert;

  constructor(options: ProvisioningProfileOptions) {
    const { experienceName, bundleIdentifier, distCert } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._distCert = distCert;
  }

  choosePreferred(profiles: ProvisioningProfileInfo[]): ProvisioningProfileInfo {
    // prefer the profile that already has the same dist cert associated with it
    const profileWithSameCert = profiles.find(profile =>
      profile.certificates.some(cert => cert.id === this._distCert.certId)
    );

    // if not, just get an arbitrary profile
    return profileWithSameCert || profiles[0];
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    if (!ctx.hasAppleCtx()) {
      return new CreateProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
      });
    }

    const ppManager = new ProvisioningProfileManager(ctx.appleCtx);
    const existingProfiles = await ppManager.list(this._bundleIdentifier);

    if (existingProfiles.length === 0) {
      return new CreateProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
      });
    }

    const autoselectedProfile = this.choosePreferred(existingProfiles);
    // autoselect creds if we find valid certs
    const confirmQuestion: Question = {
      type: 'confirm',
      name: 'confirm',
      message: `${formatProvisioningProfileFromApple(
        autoselectedProfile
      )} \n Would you like to use this profile?`,
      pageSize: Infinity,
    };

    const { confirm } = await prompt(confirmQuestion);
    if (confirm) {
      log(`Using Provisioning Profile: ${autoselectedProfile.provisioningProfileId}`);
      await configureAndUpdateProvisioningProfile(
        ctx,
        this._experienceName,
        this._bundleIdentifier,
        this._distCert,
        autoselectedProfile
      );
      return null;
    }

    const choices = [
      {
        name: '[Choose existing provisioning profile] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { name: '[Add a new provisioning profile]', value: 'GENERATE' },
    ];

    const question: Question = {
      type: 'list',
      name: 'action',
      message: 'Select a Provisioning Profile:',
      choices,
      pageSize: Infinity,
    };

    const { action } = await prompt(question);

    if (action === 'GENERATE') {
      return new CreateProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
      });
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
      });
    }

    throw new Error('unsupported action');
  }
}

async function selectProfileFromApple(
  appleCtx: AppleCtx,
  bundleIdentifier: string
): Promise<ProvisioningProfileInfo | null> {
  const ppManager = new ProvisioningProfileManager(appleCtx);
  const profiles = await ppManager.list(bundleIdentifier);
  if (profiles.length === 0) {
    log.warn(
      `There are no Provisioning Profiles available in your apple account for bundleIdentifier: ${bundleIdentifier}`
    );
    return null;
  }

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices: profiles.map((entry, index) => ({
      name: formatProvisioningProfileFromApple(entry),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt(question);
  return profiles[credentialsIndex];
}

async function selectProfileFromExpo(
  iosCredentials: IosCredentials
): Promise<IosAppCredentials | null> {
  const profiles = iosCredentials.appCredentials.filter(
    ({ credentials }) => !!credentials.provisioningProfile && !!credentials.provisioningProfileId
  );
  if (profiles.length === 0) {
    log.warn('There are no Provisioning Profiles available in your account');
    return null;
  }

  const getName = (profile: IosAppCredentials) => {
    const id = chalk.green(profile.credentials.provisioningProfileId || '-----');
    const teamId = profile.credentials.teamId || '------';
    return `Provisioning Profile (ID: ${id}, Team ID: ${teamId})`;
  };

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices: profiles.map((entry, index) => ({
      name: getName(entry),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt(question);
  return profiles[credentialsIndex];
}

async function generateProvisioningProfile(
  ctx: Context,
  bundleIdentifier: string,
  distCert: DistCert
): Promise<ProvisioningProfile> {
  await ctx.ensureAppleCtx();
  const manager = new ProvisioningProfileManager(ctx.appleCtx);
  const type = ctx.appleCtx.team.inHouse ? 'Enterprise ' : 'AppStore';
  const profileName = `*[expo] ${bundleIdentifier} ${type} ${new Date().toISOString()}`; // Apple drops [ if its the first char (!!)
  return await manager.create(bundleIdentifier, distCert, profileName);
}

// Best effort validation without Apple credentials
export async function validateProfileWithoutApple(
  provisioningProfile: ProvisioningProfile,
  distCert: DistCert,
  bundleIdentifier: string
): Promise<boolean> {
  const spinner = ora(`Performing best effort validation of Provisioning Profile...\n`).start();
  const base64EncodedProfile = provisioningProfile.provisioningProfile;
  if (!base64EncodedProfile) {
    spinner.fail('No profile on file');
    return false;
  }

  const buffer = Buffer.from(base64EncodedProfile, 'base64');
  const profile = buffer.toString('utf-8');
  const profilePlist = plist.parse(profile) as PlistObject;

  try {
    const distCertFingerprint = await PKCS12Utils.getP12CertFingerprint(
      distCert.certP12,
      distCert.certPassword
    );

    IosCodeSigning.validateProvisioningProfile(profilePlist, {
      distCertFingerprint,
      bundleIdentifier,
    });
  } catch (e) {
    spinner.fail(`Provisioning profile is invalid: ${e.toString()}`);
    return false;
  }

  const isExpired = new Date(profilePlist['ExpirationDate'] as string) <= new Date();
  if (isExpired) {
    spinner.fail('Provisioning profile is expired');
    return false;
  }

  spinner.succeed('Successfully performed best effort validation of Provisioning Profile.');
  return true;
}

export async function getAppleInfo(
  appleCtx: AppleCtx,
  bundleIdentifier: string,
  profile: ProvisioningProfile
): Promise<ProvisioningProfileInfo | null> {
  if (!profile.provisioningProfileId) {
    log(
      chalk.yellow('Provisioning Profile: cannot look up profile on Apple Servers - there is no id')
    );
    return null;
  }

  const spinner = ora(`Getting Provisioning Profile info from Apple's Servers...\n`).start();
  const ppManager = new ProvisioningProfileManager(appleCtx);
  const profilesFromApple = await ppManager.list(bundleIdentifier);

  const configuredProfileFromApple = profilesFromApple.find(
    appleProfile => appleProfile.provisioningProfileId === profile.provisioningProfileId
  );

  if (!configuredProfileFromApple) {
    spinner.fail(
      `Provisioning Profile: ${profile.provisioningProfileId} does not exist on Apple Servers`
    );
    return null;
  }

  spinner.succeed(
    `Successfully fetched Provisioning Profile ${profile.provisioningProfileId} from Apple Servers`
  );
  return configuredProfileFromApple;
}

export async function configureAndUpdateProvisioningProfile(
  ctx: Context,
  experienceName: string,
  bundleIdentifier: string,
  distCert: DistCert,
  profileFromApple: ProvisioningProfileInfo
) {
  // configure profile on Apple's Server to use our distCert
  const ppManager = new ProvisioningProfileManager(ctx.appleCtx);
  const updatedProfile = await ppManager.useExisting(bundleIdentifier, profileFromApple, distCert);
  log(
    chalk.green(
      `Successfully configured Provisioning Profile ${
        profileFromApple.provisioningProfileId
      } on Apple Servers with Distribution Certificate ${distCert.certId || ''}`
    )
  );

  // Update profile on expo servers
  await ctx.ios.updateProvisioningProfile(
    experienceName,
    bundleIdentifier,
    updatedProfile,
    ctx.appleCtx.team
  );
  log(
    chalk.green(
      `Successfully assigned Provisioning Profile to ${experienceName} (${bundleIdentifier})`
    )
  );
}

function formatProvisioningProfileFromApple(appleInfo: ProvisioningProfileInfo) {
  const { expires, provisioningProfileId } = appleInfo;
  const id = provisioningProfileId ?? '-----';
  const name = appleInfo.name ?? '-----';
  const expireString = expires ? new Date(expires * 1000).toDateString() : 'unknown';
  const details = chalk.green(`\n    Name: ${name}\n    Expiry: ${expireString}`);
  return `Provisioning Profile - ID: ${id}${details}`;
}

export async function getProvisioningProfileFromParams(builderOptions: {
  provisioningProfilePath?: string;
  teamId?: string;
}): Promise<ProvisioningProfile | null> {
  const { provisioningProfilePath, teamId } = builderOptions;

  // none of the provisioningProfile params were set, assume user has no intention of passing it in
  if (!provisioningProfilePath) {
    return null;
  }

  // partial provisioningProfile params were set, assume user has intention of passing it in
  if (!every([provisioningProfilePath, teamId])) {
    throw new Error(
      'In order to provide a Provisioning Profile through the CLI parameters, you have to pass --provisioning-profile-path and --team-id parameters.'
    );
  }

  return {
    provisioningProfile: await fs.readFile(provisioningProfilePath as string, 'base64'),
  };
}

export async function useProvisioningProfileFromParams(
  ctx: Context,
  appCredentials: IosAppCredentials,
  teamId: string,
  provisioningProfile: ProvisioningProfile,
  distCert: DistCert
): Promise<ProvisioningProfile> {
  const { experienceName, bundleIdentifier } = appCredentials;
  const isValid = await validateProfileWithoutApple(
    provisioningProfile,
    distCert,
    appCredentials.bundleIdentifier
  );
  if (!isValid) {
    throw new Error('Uploaded invalid Provisioning Profile');
  }

  return await ctx.ios.updateProvisioningProfile(
    experienceName,
    bundleIdentifier,
    provisioningProfile,
    { id: teamId }
  );
}
