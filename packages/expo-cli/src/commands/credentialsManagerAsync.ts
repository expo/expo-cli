import { Context, runCredentialsManagerStandalone } from '../credentials';
import {
  SelectAndroidExperience,
  SelectIosExperience,
  SelectPlatform,
} from '../credentials/views/Select';

type Options = {
  platform?: 'android' | 'ios';
  parent?: {
    nonInteractive: boolean;
  };
};

export async function actionAsync(projectRoot: string, options: Options) {
  const context = new Context();
  await context.init(projectRoot, {
    nonInteractive: options.parent?.nonInteractive,
  });
  let mainpage;
  if (options.platform === 'android') {
    mainpage = new SelectAndroidExperience();
  } else if (options.platform === 'ios') {
    mainpage = new SelectIosExperience();
  } else {
    mainpage = new SelectPlatform();
  }
  await runCredentialsManagerStandalone(context, mainpage);
}
