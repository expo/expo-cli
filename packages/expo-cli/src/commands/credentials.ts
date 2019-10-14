import {
  runCredentialsManager,
  Context,
} from '../credentials';
import { SelectAndroidExperience, SelectIosExperience, SelectPlatform } from '../credentials/views/Select';
import { CommanderStatic } from 'commander';

type Options = {
  platform?: 'android' | 'ios'
}

export default function (program: CommanderStatic) {
  program
    .command('credentials:manager')
    .description('Manage your iOS or Android credentials.')
    .option('-p --platform [platform]', 'Select platform [android or ios]', /^(android|ios)$/i)
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
      await runCredentialsManager(context, mainpage);
    }, /* skip project validation */ true);
};
