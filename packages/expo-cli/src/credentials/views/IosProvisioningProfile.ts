import plist, { PlistObject } from '@expo/plist';
import assert from 'assert';
import chalk from 'chalk';
import fs from 'fs-extra';
import { IosCodeSigning, PKCS12Utils } from 'xdl';

import CommandError from '../../CommandError';
import {
  AppleCtx,
  DistCert,
  ProvisioningProfile,
  ProvisioningProfileInfo,
  ProvisioningProfileManager,
} from '../../appleApi';
import Log from '../../log';
import prompt, { confirmAsync, Question } from '../../prompts';
import { ora } from '../../utils/ora';
import { displayIosAppCredentials } from '../actions/list';
import { askForUserProvided } from '../actions/promptForCredentials';
import { AppLookupParams, getAppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  provisioningProfileSchema,
} from '../credentials';
import * as provisioningProfileUtils from '../utils/provisioningProfile';

export class RemoveProvisioningProfile implements IView {
  constructor(private accountName: string, private shouldRevoke: boolean = false) {}

  async open(ctx: Context): Promise<IView | null> {
    const credentials = await ctx.ios.getAllCredentials(this.accountName);
    const selected = await selectProfileFromExpo(credentials);
    if (selected) {
      const app = getAppLookupParams(selected.experienceName, selected.bundleIdentifier);
      await this.removeSpecific(ctx, app);
      Log.log(
        chalk.green(
          `Successfully removed Provisioning Profile for ${selected.experienceName} (${selected.bundleIdentifier})`
        )
      );
    }
    return null;
  }

  async removeSpecific(ctx: Context, app: AppLookupParams) {
    Log.log('Removing Provisioning Profile...\n');
    await ctx.ios.deleteProvisioningProfile(app);

    let shouldRevoke = this.shouldRevoke;
    if (!shouldRevoke && !ctx.nonInteractive) {
      const revoke = await confirmAsync({
        message: 'Do you also want to revoke this Provisioning Profile on Apple Developer Portal?',
      });
      shouldRevoke = revoke;
    }

    if (shouldRevoke) {
      await ctx.ensureAppleCtx();
      const ppManager = new ProvisioningProfileManager(ctx.appleCtx);
      await ppManager.revoke(app.bundleIdentifier);
    }
  }
}

export class CreateProvisioningProfile implements IView {
  constructor(private app: AppLookupParams) {}

  async create(ctx: Context): Promise<ProvisioningProfile> {
    const provisioningProfile = await this.provideOrGenerate(ctx);
    return await ctx.ios.updateProvisioningProfile(this.app, provisioningProfile);
  }

  async open(ctx: Context): Promise<IView | null> {
    await this.create(ctx);

    Log.log(chalk.green('Successfully created Provisioning Profile\n'));
    const appCredentials = await ctx.ios.getAppCredentials(this.app);
    displayIosAppCredentials(appCredentials);
    Log.log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<ProvisioningProfile> {
    if (!ctx.nonInteractive) {
      const userProvided = await askForUserProvided(provisioningProfileSchema);
      if (userProvided) {
        // userProvided profiles don't come with ProvisioningProfileId's (only accessible from Apple Portal API)
        Log.log(chalk.yellow('Provisioning profile: Unable to validate specified profile.'));
        return {
          ...userProvided,
          ...provisioningProfileUtils.readAppleTeam(userProvided.provisioningProfile),
        };
      }
    }
    const distCert = await ctx.ios.getDistCert(this.app);
    assert(distCert, 'missing distribution certificate');
    return await generateProvisioningProfile(ctx, this.app.bundleIdentifier, distCert);
  }
}

export class UseExistingProvisioningProfile implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    await ctx.ensureAppleCtx();

    if (ctx.nonInteractive) {
      throw new CommandError(
        'NON_INTERACTIVE',
        "Start the CLI without the '--non-interactive' flag to select a distribution certificate."
      );
    }

    const selected = await selectProfileFromApple(ctx.appleCtx, this.app.bundleIdentifier);
    if (selected) {
      const distCert = await ctx.ios.getDistCert(this.app);
      assert(distCert, 'missing distribution certificate');

      await configureAndUpdateProvisioningProfile(ctx, this.app, distCert, selected);
    }
    return null;
  }
}

export class CreateOrReuseProvisioningProfile implements IView {
  constructor(private app: AppLookupParams) {}

  choosePreferred(
    profiles: ProvisioningProfileInfo[],
    distCert: IosDistCredentials
  ): ProvisioningProfileInfo {
    // prefer the profile that already has the same dist cert associated with it
    const profileWithSameCert = profiles.find(profile =>
      profile.certificates.some(cert => cert.id === distCert.certId)
    );

    // if not, just get an arbitrary profile
    return profileWithSameCert || profiles[0];
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    if (!ctx.hasAppleCtx()) {
      return new CreateProvisioningProfile(this.app);
    }

    const ppManager = new ProvisioningProfileManager(ctx.appleCtx);
    const existingProfiles = await ppManager.list(this.app.bundleIdentifier);

    if (existingProfiles.length === 0) {
      return new CreateProvisioningProfile(this.app);
    }

    const distCert = await ctx.ios.getDistCert(this.app);
    assert(distCert, 'missing distribution certificate');

    const autoselectedProfile = this.choosePreferred(existingProfiles, distCert);
    // autoselect creds if we find valid certs

    if (!ctx.nonInteractive) {
      const confirm = await confirmAsync({
        message: `${formatProvisioningProfileFromApple(
          autoselectedProfile
        )} \n Would you like to use this profile?`,
        limit: Infinity,
      });
      if (!confirm) {
        return await this._createOrReuse(ctx);
      }
    }

    Log.log(`Using Provisioning Profile: ${autoselectedProfile.provisioningProfileId}`);
    await configureAndUpdateProvisioningProfile(ctx, this.app, distCert, autoselectedProfile);
    return null;
  }

  async _createOrReuse(ctx: Context): Promise<IView | null> {
    const choices = [
      {
        title: '[Choose existing provisioning profile] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { title: '[Add a new provisioning profile]', value: 'GENERATE' },
    ];

    const question: Question = {
      type: 'select',
      name: 'action',
      message: 'Select a Provisioning Profile:',
      choices,
      optionsPerPage: 20,
    };

    const { action } = await prompt(question);

    if (action === 'GENERATE') {
      return new CreateProvisioningProfile(this.app);
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingProvisioningProfile(this.app);
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
    Log.warn(
      `There are no Provisioning Profiles available in your apple account for bundleIdentifier: ${bundleIdentifier}`
    );
    return null;
  }

  const question: Question = {
    type: 'select',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices: profiles.map((entry, index) => ({
      title: formatProvisioningProfileFromApple(entry),
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
    Log.warn('There are no Provisioning Profiles available in your account');
    return null;
  }

  const getName = (profile: IosAppCredentials) => {
    const id = chalk.green(profile.credentials.provisioningProfileId || '-----');
    const teamId = profile.credentials.teamId || '------';
    return `Provisioning Profile (ID: ${id}, Team ID: ${teamId})`;
  };

  const question: Question = {
    type: 'select',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices: profiles.map((entry, index) => ({
      title: getName(entry),
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
    Log.log(
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
  app: AppLookupParams,
  distCert: DistCert,
  profileFromApple: ProvisioningProfileInfo
) {
  // configure profile on Apple's Server to use our distCert
  const ppManager = new ProvisioningProfileManager(ctx.appleCtx);
  const updatedProfile = await ppManager.useExisting(
    app.bundleIdentifier,
    profileFromApple,
    distCert
  );
  Log.log(
    chalk.green(
      `Successfully configured Provisioning Profile ${
        profileFromApple.provisioningProfileId
      } on Apple Servers with Distribution Certificate ${distCert.certId || ''}`
    )
  );

  // Update profile on expo servers
  await ctx.ios.updateProvisioningProfile(app, updatedProfile);
  Log.log(
    chalk.green(
      `Successfully assigned Provisioning Profile to @${app.accountName}/${app.projectName} (${app.bundleIdentifier})`
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

export async function getProvisioningProfileFromParams(
  provisioningProfilePath?: string
): Promise<ProvisioningProfile | null> {
  if (!provisioningProfilePath) {
    return null;
  }

  const provisioningProfile = await fs.readFile(provisioningProfilePath as string, 'base64');
  const team = provisioningProfileUtils.readAppleTeam(provisioningProfile);

  return {
    provisioningProfile,
    ...team,
  };
}

export async function useProvisioningProfileFromParams(
  ctx: Context,
  app: AppLookupParams,
  provisioningProfile: ProvisioningProfile
): Promise<ProvisioningProfile> {
  const distCert = await ctx.ios.getDistCert(app);
  assert(distCert, 'missing distribution certificate');

  const isValid = await validateProfileWithoutApple(
    provisioningProfile,
    distCert,
    app.bundleIdentifier
  );
  if (!isValid) {
    throw new Error('Specified invalid Provisioning Profile');
  }

  return await ctx.ios.updateProvisioningProfile(app, provisioningProfile);
}
