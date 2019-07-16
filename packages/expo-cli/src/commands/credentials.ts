import {
  runCredentialsManager,
  Context,
} from '../credentials';
import { SelectAndroidExperience, SelectPlatform } from '../credentials/views/Select';
import { CommanderStatic } from 'commander';

export default function (program: CommanderStatic) {
  program
    .command('credentials:manager:android')
    .description('Manage your Android credentials')
    .asyncAction(async () => {
      const projectDir = process.cwd();
      const context = new Context();
      await context.init(projectDir);
      await runCredentialsManager(context, new SelectAndroidExperience());
    }, /* skip project validation */ true);

  // @ts-ignore disabled for now
  return;

  program
    .command('credentials:manager')
    .description('Manage your credentials')
    .asyncAction(async () => {
      const projectDir = process.cwd();
      const context = new Context();
      await context.init(projectDir);
      await runCredentialsManager(context, new SelectPlatform());
    }, /* skip project validation */ true);

  program
    .command('credentials:manager:ios')
    .description('Manage your iOS credentials')
    .asyncAction(async () => {
      const projectDir = process.cwd();
      const context = new Context(); // TODO: implement ios part
      await context.init(projectDir);
      await runCredentialsManager(context, new SelectAndroidExperience());
    }, /* skip project validation */ true);
};
