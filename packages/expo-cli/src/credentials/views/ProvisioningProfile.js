/* @flow */

import chalk from 'chalk';

import { View } from './View';
import { Context, credentialTypes, PROVISIONING_PROFILE } from '../schema';
import type { IosCredentials, IosPushCredentials, IosAppCredentials } from '../schema';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import prompt from '../../prompt';
import log from '../../log';
import { pushKeyManager, provisioningProfileManager } from '../../appleApi';

export class RemoveProvisioningProfile extends View {
  iosCredentials: IosCredentials;
  shouldRevoke: boolean;

  constructor(iosCredentials: IosCredentials, shouldRevoke: boolean = false) {
    super();
    this.iosCredentials = iosCredentials;
    this.shouldRevoke = shouldRevoke;
  }

  async open(context: Context): Promise<?View> {
    const selected = selectProfileFromList(this.iosCredentials);
    if (selected) {
      await this.removeSpecific(context, selected);
    }
  }

  async removeSpecific(context: Context, selected: IosAppCredentials) {
    log(
      `Removing provisioning profile for ${selected.experienceName} ${selected.bundleIdentifier}`
    );
    await context.apiClient.deleteAsync(
      `credentials/ios/app/provisioning/${selected.appCredentialsId}`
    );

    const { revoke } = await prompt([
      {
        type: 'confirm',
        name: 'revoke',
        message: 'Do you also want to revoke it on Apple Developer Portal?',
        when: !this.shouldRevoke,
      },
    ]);
    if (revoke || this.shouldRevoke) {
      await context.ensureAppleCtx();
      const ppManager = provisioningProfileManager(context.appleCtx);
      await ppManager.revoke(selected.bundleIdentifier);
    }
  }
}

async function selectProfileFromList(iosCredentials: IosCredentials) {
  const profiles = iosCredentials.appCredentials.filter(
    cred => !!cred.provisioningProfile && !!cred.provisioningProfileId
  );

  const getName = profile => {
    const id = chalk.green(profile.provisioningProfileId);
    const teamId = profile.teamId || '------';
    return `Provisioning Profile (ID: ${id}, Team ID: ${teamId})`;
  };

  const question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select Provisioning Profile from the list.',
    choices: profiles.map((entry, index) => ({
      name: getName(entry),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt([question]);
  return profiles[credentialsIndex];
}
