/* @flow */

import prompt from '../../prompt';

import { View } from './View';
import * as iosPushCredentials from './PushCredentialsIos';
import * as iosDistCredentials from './DistCredentialsIos';
import * as androidCredentials from './AndroidCredentials';
import { Context } from '../schema';
import type { IosCredentials, AndroidCredentials } from '../schema';
import {
  getIosCredentials,
  displayIosCredentials,
  getAndroidCredentials,
  displayAndroidCredentials,
} from '../actions/list';

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
          // {
          //   value: 'current-remove-push-ios',
          //   name: 'Remove Push Notifactions credentials for current project',
          // },
          // {
          //   value: 'current-remove-dist-ios',
          //   name: 'Remove Distribution Certificate for current project',
          // },
          // {
          //   value: 'current-remove-app-ios',
          //   name: 'Remove all credentials for current project',
          // },
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
      case 'use-existing-push-ios':
        return new iosPushCredentials.UseExistingPushNotification(this.iosCred);
      case 'use-existing-dist-ios':
        return new iosDistCredentials.UseExistingDistributionCert(this.iosCred);
    }
  }
}

export class SummaryAndroid extends View {
  async open(context: Context): Promise<?View> {
    if (context.hasProjectContext) {
      const experienceName = `@${context.user.username}/${context.manifest.slug}`;
      const { runProjectContext } = await prompt([
        {
          type: 'confirm',
          name: 'runProjectContext',
          message: `You are currently in a directory with ${experienceName} experience. Do you want to select it?`,
          default: false,
        },
      ]);
      if (runProjectContext) {
        const view = new androidCredentials.ExperienceView(context.manifest.slug, null);
        context.changeMainpage(view);
        return view;
      }
    }
    const { appCredentials } = await getAndroidCredentials(context.apiClient);

    await displayAndroidCredentials(appCredentials);

    const question = {
      type: 'list',
      name: 'appIndex',
      message: 'Select application',
      choices: appCredentials.map((cred, index) => ({
        name: cred.experienceName,
        value: index,
      })),
      pageSize: Infinity,
    };

    const { appIndex } = await prompt([question]);

    const matchName = appCredentials[appIndex].experienceName.match(/@[\w.-]+\/([\w.-]+)/);
    const view = new androidCredentials.ExperienceView(
      matchName && matchName[1],
      appCredentials[appIndex]
    );
    context.changeMainpage(view);
    return view;
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
