import { runCredentialsManager, Context } from '../credentials';
import {
  SelectAndroidExperience,
  SelectIosExperience,
} from '../credentials/views/Select';
import { CommanderStatic } from 'commander';
import { UserManager, ApiV2 } from '@expo/xdl';
import log from '../log';
import prompt from '../prompt';
import isEmpty from 'lodash/isEmpty';

type ClearOptions = {
  force: boolean;
};

export default function(program: CommanderStatic) {
  const androidManageCommand = program.command('keychain:android:manage');
  androidManageCommand
    .description('Manage your Android keystore, hashes and FCM keys.')
    .asyncAction(async () => {
      const projectDir = process.cwd();
      const context = new Context();
      await context.init(projectDir);
      const mainpage = new SelectAndroidExperience();

      await runCredentialsManager(context, mainpage);
    }, /* skip project validation */ true);

  const iosManageCommand = program.command('keychain:ios:manage');
  iosManageCommand
    .description('Manage your Apple certificates, identifiers, profiles and keys.')
    .asyncAction(async () => {
      const projectDir = process.cwd();
      const context = new Context();
      await context.init(projectDir);
      const mainpage = new SelectIosExperience();

      await runCredentialsManager(context, mainpage);
    }, /* skip project validation */ true);

  const iosClearCommand = program.command('keychain:ios:clear');
  iosClearCommand
    .option('-f, --force', 'Bypasses the confirmation prompt.')
    .description(
      `Removes all Apple certificates, identifiers, profiles and keys associated with your account from Expo's servers . Use keychain:ios:manage for more precise actions.`
    )
    .asyncAction(async (options: ClearOptions) => {
      const user = await UserManager.ensureLoggedInAsync();
      const api = ApiV2.clientForUser(user);
      const {appCredentials, userCredentials} = await api.getAsync('credentials/ios');
      if (isEmpty(appCredentials) && isEmpty(userCredentials)) {
        log.warn(`No credentials found under the account ${user.username}`)
        process.exit()
      }
      if (options.force) {
        await api.postAsync('credentials/ios/user/delete');
        log.warn(`Removed existing Apple credentials from Expo's servers.`);
      } else {
        const { confirm } = await prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Please confirm you wish to remove all Apple credentials from Expo's servers.`,
          },
        ]);
        if (confirm) {
          await api.postAsync('credentials/ios/user/delete');
          log.warn(`Removed existing Apple credentials from Expo's servers.`);
        }
      }
    });
}