import { CommanderStatic } from 'commander';
import { Context, runCredentialsManagerStandalone } from '../credentials';
import {
  SelectAndroidExperience,
  SelectIosExperience,
  SelectPlatform,
} from '../credentials/views/Select';

type Options = {
  platform?: 'android' | 'ios';
};

export default function (program: CommanderStatic) {
  program
    .command('credentials:manager')
    .description('Manage your credentials')
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .asyncAction(async (options: Options) => {
      const projectDir = process.cwd();
      const context = new Context();
      await context.init(projectDir);
      let mainpage;
      if (options.platform === 'android') {
        mainpage = new SelectAndroidExperience();
      } else if (options.platform === 'ios') {
        mainpage = new SelectIosExperience();
      } else {
        mainpage = new SelectPlatform();
      }
      await runCredentialsManagerStandalone(context, mainpage);
    }, /* skip project validation */ true);
}
