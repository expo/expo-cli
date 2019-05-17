/* @flow */

import { CredentialsManager } from '../credentials/CredentialsManager';
import { SummaryIos, SummaryAndroid } from '../credentials/views/Summary';

export default (program: any) => {
  program
    .command('credentials:manager')
    .description('Manage your credentials')
    .asyncAction(async options => {
      const projectDir = process.cwd();
      const manager = new CredentialsManager(projectDir, options);
      await manager.init();
      await manager.cli();
    }, /* skip project validation */ true);

  program
    .command('credentials:manager:ios')
    .description('Manage your credentials')
    .asyncAction(async options => {
      const projectDir = process.cwd();
      const manager = new CredentialsManager(projectDir, options);
      await manager.init();
      manager.mainpage = new SummaryIos();
      await manager.cli();
    }, /* skip project validation */ true);

  program
    .command('credentials:manager:android')
    .description('Manage your credentials')
    .asyncAction(async options => {
      const projectDir = process.cwd();
      const manager = new CredentialsManager(projectDir, options);
      await manager.init();
      manager.mainpage = new SummaryAndroid();
      await manager.cli();
    }, /* skip project validation */ true);
};
