import get from 'lodash/get';
import prompt, { Question } from '../../prompt';
import log from '../../log';

import * as androidCredentials from './AndroidCredentials';
import { Context, IView } from '../context';
import { AndroidCredentials } from '../credentials';
import {
  displayAndroidCredentials,
} from '../actions/list';

export class Summary implements IView {
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
    context.mainView = platform === 'ios' ? new SummaryAndroid() : new SummaryAndroid();
    return context.mainView;
  }
}

export class SummaryAndroid implements IView {
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
          default: false,
        },
      ]);
      if (runProjectContext) {
        const view = new androidCredentials.ExperienceView(ctx.manifest.slug, null);
        ctx.mainView = view;
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
      log.error('invalid experience name');
    }
    return null;
  }
}

export async function askQuit(mainpage: IView): Promise<IView> {
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
