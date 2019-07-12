import {
  runCredentialsManager,
  CredentialsManagerOptions,
  Context,
} from '../credentials';
import { SummaryAndroid, Summary } from '../credentials/views/Summary';
import { CommanderStatic } from 'commander';

export default function (program: CommanderStatic) {
  // @ts-ignore disabled for now
  return 
  program
    .command('credentials:manager')
    .description('Manage your credentials')
    .asyncAction(async (options: CredentialsManagerOptions) => {
      const projectDir = process.cwd();
      const context = new Context(new Summary());
      await context.init(projectDir, options);
      await runCredentialsManager(context);
    }, /* skip project validation */ true);

  program
    .command('credentials:manager:ios')
    .description('Manage your credentials')
    .asyncAction(async (options: CredentialsManagerOptions) => {
      const projectDir = process.cwd();
      const context = new Context(new SummaryAndroid()); // TODO: implement ios part
      await context.init(projectDir, options);
      await runCredentialsManager(context);
    }, /* skip project validation */ true);

  program
    .command('credentials:manager:android')
    .description('Manage your credentials')
    .asyncAction(async (options: CredentialsManagerOptions) => {
      const projectDir = process.cwd();
      const context = new Context(new SummaryAndroid());
      await context.init(projectDir, options);
      await runCredentialsManager(context);
    }, /* skip project validation */ true);
};
