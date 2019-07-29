import chalk from 'chalk';

import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView } from '../context';
import { IosAppCredentials, IosCredentials } from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import { ProvisioningProfileManager, ProvisioningProfile } from '../../appleApi';

export class RemoveProvisioningProfile implements IView {
  shouldRevoke: boolean;

  constructor(shouldRevoke: boolean = false) {
    this.shouldRevoke = shouldRevoke;
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectProfileFromList(ctx.ios.credentials);
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

async function selectProfileFromList(iosCredentials: IosCredentials): Promise<IosAppCredentials | null> {
  const profiles = iosCredentials.appCredentials.filter(
    ({ credentials })=> !!credentials.provisioningProfile && !!credentials.provisioningProfileId
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
