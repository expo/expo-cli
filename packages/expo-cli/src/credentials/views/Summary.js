/* @flow */

import prompt from '../../prompt';

import { View } from './View';
import * as iosPushCredentials from './PushCredentialsIos';
import * as iosDistCredentials from './DistCredentialsIos';
import { Context } from '../schema';
import type { IosCredentials } from '../schema';
import { getIosCredentials, displayIosCredentials } from '../actions/list';
// import { getAndroidCredentials, displayAndroidCredentials } from '../actions/list';

export class Summary extends View {
  async open(context: Context): Promise<?View> {
    const { platform } = await prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select platform',
        pageSize: Infinity,
        choices: ['ios', 'android'],
      },
    ]);
    return platform === 'ios' ? new SummaryIos() : new SummaryAndroid();
  }
}

export class SummaryIos extends View {
  iosCred: IosCredentials;

  async open(context: Context): Promise<?View> {
    this.iosCred = await getIosCredentials(context.apiClient);

    await displayIosCredentials(this.iosCred);

    const projectSpecificActions = context.hasProjectContext
      ? [
          {
            value: 'use-existing-push-ios',
            name: 'Use existing Push Notifications Key in current project',
          },
          {
            value: 'use-existing-dist-ios',
            name: 'Use existing Distribution Certificate in current project',
          },
          {
            value: 'current-remove-push-ios',
            name: 'Remove Push Notifactions credentials for current project',
          },
          {
            value: 'current-remove-dist-ios',
            name: 'Remove Distribution Certificate for current project',
          },
          {
            value: 'current-remove-app-ios',
            name: 'Remove all credentials for current project',
          },
        ]
      : [];

    const question = {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        { value: 'create-ios-push', name: 'Add new Push Notifications Key' },
        { value: 'remove-ios-push', name: 'Remove Push Notification credentials' },
        { value: 'update-ios-push', name: 'Update Push Notifications Key' },
        { value: 'create-ios-dist', name: 'Add new Distribution Certificate' },
        { value: 'remove-ios-dist', name: 'Remove Distribution Certificate' },
        { value: 'update-ios-dist', name: 'Update Distribution Certificate' },
        ...projectSpecificActions,
      ],
      pageSize: Infinity,
    };

    const { action } = await prompt([question]);
    return this.handleAction(context, action);
  }

  handleAction(context: Context, action: string): ?View {
    switch (action) {
      case 'create-ios-push':
        return new iosPushCredentials.CreateIosPush(this.iosCred);
      case 'update-ios-push':
        return new iosPushCredentials.UpdateIosPush(this.iosCred);
      case 'remove-ios-push':
        return new iosPushCredentials.RemoveIosPush(this.iosCred);
      case 'create-ios-dist':
        return new iosDistCredentials.CreateIosDist(this.iosCred);
      case 'update-ios-dist':
        return new iosDistCredentials.UpdateIosDist(this.iosCred);
      case 'remove-ios-dist':
        return new iosDistCredentials.RemoveIosDist(this.iosCred);
      default:
        return null;
    }
  }
}

export class SummaryAndroid extends View {
  androidCred: any = {};

  async open(context: Context): Promise<?View> {
    //this.androidCred = await getAndroidCredentials(context.apiClient);

    await displayIosCredentials(this.androidCred);

    const question = {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [],
      pageSize: Infinity,
    };

    const { action } = await prompt([question]);
    return this.handleAction(context, action);
  }

  handleAction(context: Context, action: string): ?View {
    switch (action) {
      default:
        return null;
    }
  }
}

export async function askQuit(mainpage: View): Promise<View> {
  const { selected } = await prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Do you want to quit credential manager',
      choices: [
        { value: 'exit', name: 'Quit credential manager' },
        { value: 'mainpage', name: 'Go back to the credentials summary' },
      ],
    },
  ]);
  if (selected === 'exit') {
    process.exit(0);
  }
  return mainpage;
}
