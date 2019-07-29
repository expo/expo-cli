import chalk from 'chalk';
import get from 'lodash/get';

import { IView, Context } from '../context';
import { IosCredentials, IosPushCredentials, IosAppCredentials } from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import prompt from '../../prompt';
import log from '../../log';

export class CreateAppCredentialsIos implements IView {

  async open(context: Context): Promise<IView | null> {
    throw new Error('no implemented');
  }
}
