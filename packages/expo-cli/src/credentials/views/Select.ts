import invariant from 'invariant';

import prompt, { ChoiceType, Question } from '../../prompt';
import { displayAndroidCredentials, displayIosCredentials } from '../actions/list';
import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import { CredentialsManager } from '../route';
import * as androidView from './AndroidCredentials';
import * as iosDistView from './IosDistCert';
import * as iosProvisionigProfileView from './IosProvisioningProfile';
import * as iosPushView from './IosPushCredentials';

export class SelectPlatform implements IView {
  async open(ctx: Context): Promise<IView | null> {
    const { platform } = await prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select platform',
        pageSize: Infinity,
        choices: ['ios', 'android'],
      },
    ]);
    const view = platform === 'ios' ? new SelectIosExperience() : new SelectAndroidExperience();
    CredentialsManager.get().changeMainView(view);
    return view;
  }
}

export class SelectIosExperience implements IView {
  async open(ctx: Context): Promise<IView | null> {
    const accountName =
      (ctx.hasProjectContext ? ctx.manifest.owner : undefined) ?? ctx.user.username;
    const iosCredentials = await ctx.ios.getAllCredentials(accountName);

    await displayIosCredentials(iosCredentials);

    const projectSpecificActions: ChoiceType<string>[] = ctx.hasProjectContext
      ? [
          prompt.separator('---- Current project actions ----'),
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
          prompt.separator('---- Account level actions ----'),
        ]
      : [];

    const question: Question = {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        ...projectSpecificActions,
        { value: 'remove-provisioning-profile', name: 'Remove Provisioning Profile' },
        { value: 'create-ios-push', name: 'Add new Push Notifications Key' },
        { value: 'remove-ios-push', name: 'Remove Push Notification credentials' },
        { value: 'update-ios-push', name: 'Update Push Notifications Key' },
        { value: 'create-ios-dist', name: 'Add new Distribution Certificate' },
        { value: 'remove-ios-dist', name: 'Remove Distribution Certificate' },
        { value: 'update-ios-dist', name: 'Update Distribution Certificate' },
      ],
      pageSize: Infinity,
    };

    const { action } = await prompt(question);
    return this.handleAction(ctx, accountName, action);
  }

  getAppLookupParamsFromContext(ctx: Context): AppLookupParams {
    const projectName = ctx.manifest.slug;
    const accountName = ctx.manifest.owner || ctx.user.username;
    const bundleIdentifier = ctx.manifest.ios?.bundleIdentifier;
    if (!bundleIdentifier) {
      throw new Error(`ios.bundleIdentifier need to be defined`);
    }

    return { accountName, projectName, bundleIdentifier };
  }

  handleAction(ctx: Context, accountName: string, action: string): IView | null {
    switch (action) {
      case 'create-ios-push':
        return new iosPushView.CreateIosPush(accountName);
      case 'update-ios-push':
        return new iosPushView.UpdateIosPush(accountName);
      case 'remove-ios-push':
        return new iosPushView.RemoveIosPush(accountName);
      case 'create-ios-dist':
        return new iosDistView.CreateIosDist(accountName);
      case 'update-ios-dist':
        return new iosDistView.UpdateIosDist(accountName);
      case 'remove-ios-dist':
        return new iosDistView.RemoveIosDist(accountName);
      case 'use-existing-push-ios': {
        const app = this.getAppLookupParamsFromContext(ctx);
        return new iosPushView.UseExistingPushNotification(app);
      }
      case 'use-existing-dist-ios': {
        const app = this.getAppLookupParamsFromContext(ctx);
        return new iosDistView.UseExistingDistributionCert(app);
      }
      case 'remove-provisioning-profile':
        return new iosProvisionigProfileView.RemoveProvisioningProfile(accountName);
      default:
        throw new Error('Unknown action selected');
    }
  }
}

export class SelectAndroidExperience implements IView {
  private askAboutProjectMode = true;

  async open(ctx: Context): Promise<IView | null> {
    if (ctx.hasProjectContext && this.askAboutProjectMode) {
      const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

      const { runProjectContext } = await prompt([
        {
          type: 'confirm',
          name: 'runProjectContext',
          message: `You are currently in a directory with ${experienceName} experience. Do you want to select it?`,
        },
      ]);

      if (runProjectContext) {
        invariant(ctx.manifest.slug, 'app.json slug field must be set');
        const view = new androidView.ExperienceView(experienceName);
        CredentialsManager.get().changeMainView(view);
        return view;
      }
    }
    this.askAboutProjectMode = false;

    const credentials = await ctx.android.fetchAll();
    await displayAndroidCredentials(Object.values(credentials));

    const question: Question = {
      type: 'list',
      name: 'experienceName',
      message: 'Select application',
      choices: Object.values(credentials).map(cred => ({
        name: cred.experienceName,
        value: cred.experienceName,
      })),
      pageSize: Infinity,
    };
    const { experienceName } = await prompt(question);

    return new androidView.ExperienceView(experienceName);
  }
}

export class QuitError extends Error {
  constructor() {
    super();

    // Set the prototype explicitly.
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, QuitError.prototype);
  }
}

export interface IQuit {
  runAsync(mainpage: IView): Promise<IView>;
}

export class DoQuit implements IQuit {
  async runAsync(mainpage: IView): Promise<IView> {
    throw new QuitError();
  }
}

export class AskQuit implements IQuit {
  async runAsync(mainpage: IView): Promise<IView> {
    const { selected } = await prompt([
      {
        type: 'list',
        name: 'selected',
        message: 'Do you want to quit Credential Manager',
        choices: [
          { value: 'exit', name: 'Quit Credential Manager' },
          { value: 'mainpage', name: 'Go back to experience overview.' },
        ],
      },
    ]);
    if (selected === 'exit') {
      process.exit(0);
    }
    return mainpage;
  }
}
