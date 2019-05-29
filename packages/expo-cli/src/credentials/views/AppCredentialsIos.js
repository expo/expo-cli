/* @flow */

import chalk from 'chalk';
import get from 'lodash/get';

import { View } from './View';
import { CreateIosAppCredentials } from './AppCredentialsIos';
import { Context, credentialTypes, PUSH_KEY } from '../schema';
import type { IosCredentials, IosPushCredentials, IosAppCredentials } from '../schema';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import prompt from '../../prompt';
import log from '../../log';
import { pushKeyManager } from '../../appleApi';

export class CreateAppCredentialsIos extends View {
  async create(context: Context, experience: string, bundleIdentifier: string): Promise<number> {
    const { appCredentialsId } = await context.apiClient.putAsync(`credentials/ios/app`, {
      experience,
      bundleIdentifier,
    });
    return appCredentialsId;
  }

  async open(context: Context): Promise<?View> {
    throw new Error('no implemented');
  }
}
