import get from 'lodash/get';
import prompt, { Question } from '../../prompt';
import log from '../../log';

import * as androidCredentials from './AndroidCredentials';
import { Context, IView } from '../context';
import { AndroidCredentials } from '../credentials';
import { changeMainView } from '../route';
import {
  displayAndroidCredentials,
} from '../actions/list';

export class SelectPlatform implements IView {
  async open(context: Context): Promise<IView | null> {
    const { platform } = await prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select platform',
        pageSize: Infinity,
        choices: ['ios', 'android'],
      },
    ]);
    const view = platform === 'ios' ? new SelectPlatform() : new SelectAndroidExperience();
    changeMainView(view);
    return view;
  }
}

export class SelectAndroidExperience implements IView {
  androidCredentials: AndroidCredentials[] = [];
  askAboutProjectMode = true;

  async open(ctx: Context): Promise<IView | null> {
    if (ctx.hasProjectContext && this.askAboutProjectMode) {
      const experienceName = `@${ctx.user.username}/${ctx.manifest.slug}`;
      const { runProjectContext } = await prompt([
        {
          type: 'confirm',
          name: 'runProjectContext',
          message: `You are currently in a directory with ${experienceName} experience. Do you want to select it?`,
        },
      ]);
      if (runProjectContext) {
        const view = new androidCredentials.ExperienceView(ctx.manifest.slug, null);
        changeMainView(view);
        return view;
      }
    }
    this.askAboutProjectMode = false;

    if (this.androidCredentials) {
      this.androidCredentials = get(await ctx.api.getAsync('credentials/android'), 'credentials')
    }
    await displayAndroidCredentials(this.androidCredentials);

    const question: Question = {
      type: 'list',
      name: 'appIndex',
      message: 'Select application',
      choices: this.androidCredentials.map((cred, index) => ({
        name: cred.experienceName,
        value: index,
      })),
      pageSize: Infinity,
    };

    const { appIndex } = await prompt(question);

    const matchName = this.androidCredentials[appIndex].experienceName.match(/@[\w.-]+\/([\w.-]+)/);
    if (matchName && matchName[1]) {
      return new androidCredentials.ExperienceView(matchName[1], this.androidCredentials[appIndex]);
    } else {
      log.error('Invalid experience name');
    }
    return null;
  }
}

export async function askQuit(mainpage: IView): Promise<IView> {
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
