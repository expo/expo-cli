import chalk from 'chalk';
import find from 'lodash/find';
import ora from 'ora';
import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView } from '../context';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  provisioningProfileSchema,
} from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosAppCredentials } from '../actions/list';
import {
  AppleCtx,
  DistCert,
  ProvisioningProfile,
  ProvisioningProfileInfo,
  ProvisioningProfileManager,
} from '../../appleApi';
import { GoBackError } from '../route';

export type ProvisioningProfileOptions = {
  experienceName: string;
  bundleIdentifier: string;
  distCert: DistCert;
};

export class RemoveProvisioningProfile implements IView {
  shouldRevoke: boolean;

  constructor(shouldRevoke: boolean = false) {
    this.shouldRevoke = shouldRevoke;
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
    await ctx.ios.deleteProvisioningProfile(selected.experienceName, selected.bundleIdentifier);

    const { revoke } = await prompt([
      {
        type: 'confirm',
        name: 'revoke',
        message: 'Do you also want to revoke it on Apple Developer Portal?',
        when: !this.shouldRevoke,
      },
    ]);
    if (revoke || this.shouldRevoke) {
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
    return await ctx.ios.updateProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier,
      provisioningProfile,
      ctx.appleCtx.team
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
      if (!ctx.hasAppleCtx()) {
        log(
          chalk.yellow(
            'Provisioning profile: Unable to validate profile, insufficient Apple Credentials'
          )
        );
        return userProvided;
      }
      const updatedProfile = await configureProfileWithApple(
        ctx.appleCtx,
        this._bundleIdentifier,
        userProvided,
        this._distCert
      );
      if (!updatedProfile) {
        throw new Error(
          `Provisioning profile ${userProvided.provisioningProfileId} could not be configured`
        );
      }
      return updatedProfile;
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
      const manager = new ProvisioningProfileManager(ctx.appleCtx);
      const updatedProfile = await manager.useExisting(
        this._bundleIdentifier,
        selected,
        this._distCert
      );
      await ctx.ios.updateProvisioningProfile(
        this._experienceName,
        this._bundleIdentifier,
        updatedProfile,
        ctx.appleCtx.team
      );
      log(
        chalk.green(
          `Successfully assigned Provisioning Profile to ${this._experienceName} (${this._bundleIdentifier})`
        )
      );
      return null;
    }
    throw new GoBackError();
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

  async updateProvisioningProfile(ctx: Context, provisioningProfile: ProvisioningProfile) {
    await ctx.ios.updateProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier,
      provisioningProfile,
      ctx.appleCtx.team
    );
    log(
      chalk.green(
        `Successfully assigned Provisioning Profile to ${this._experienceName} (${this._bundleIdentifier})`
      )
    );
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
      await this.updateProvisioningProfile(ctx, autoselectedProfile);
      return null;
    }

    const choices = [
      {
        name: '[Choose existing provisioning profile] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { name: '[Add a new provisioning profile]', value: 'GENERATE' },
      { name: '[Go back]', value: 'GO_BACK' },
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
    } else {
      throw new GoBackError(); // go back
    }
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

  const NONE_SELECTED = -1;
  const choices = profiles.map((entry, index) => ({
    name: formatProvisioningProfileFromApple(entry),
    value: index,
  }));
  choices.push({
    name: '[Go back]',
    value: NONE_SELECTED,
  });

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices,
  };
  const { credentialsIndex } = await prompt(question);
  if (credentialsIndex === NONE_SELECTED) {
    return null;
  }
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

  const NONE_SELECTED = -1;
  const choices = profiles.map((entry, index) => ({
    name: getName(entry),
    value: index,
  }));
  choices.push({
    name: '[Go back]',
    value: NONE_SELECTED,
  });

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices,
  };
  const { credentialsIndex } = await prompt(question);
  if (credentialsIndex === NONE_SELECTED) {
    return null;
  }
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
  appCredentials: IosAppCredentials,
  distCert: IosDistCredentials
): Promise<boolean> {
  const spinner = ora(`Performing best effort validation of Provisioning Profile...\n`).start();
  if (appCredentials.distCredentialsId !== distCert.id) {
    spinner.fail('Provisioning profile on file is associated with a different distribution cert');
    return false;
  }

  const base64EncodedProfile = appCredentials.credentials.provisioningProfile;
  if (!base64EncodedProfile) {
    spinner.fail('No profile on file');
    return false;
  }

  if (ProvisioningProfileManager.isExpired(base64EncodedProfile)) {
    spinner.fail('Provisioning profile on file is expired');
    return false;
  }

  spinner.succeed('Successfully performed best effort validation of Provisioning Profile.');
  log(chalk.yellow('To perform full validation, please provide sufficient Apple Credentials'));
  return true;
}

export async function configureProfileWithApple(
  appleCtx: AppleCtx,
  bundleIdentifier: string,
  profile: ProvisioningProfile,
  distCert: DistCert
): Promise<ProvisioningProfile | null> {
  const spinner = ora(`Configuring Provisioning Profile on Apple's Servers...\n`).start();
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

  const updatedProfile = await ppManager.useExisting(bundleIdentifier, profile, distCert);

  spinner.succeed(
    `Successfully configured ${profile.provisioningProfileId} on Apple Servers with distribution certificate ${distCert.certId}`
  );
  return updatedProfile;
}

function formatProvisioningProfileFromApple(appleInfo: ProvisioningProfileInfo) {
  const { name, status, expires, provisioningProfileId } = appleInfo;
  const id = chalk.green(provisioningProfileId || '-----');
  const details = `Status: ${status} || Expiry: ${expires}`;
  return `Provisioning Profile (ID: ${id}, Name: ${name})\n    ${details}`;
}
