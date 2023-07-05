import chalk from 'chalk';

import Log from '../log';

// Not needed anymore, we tell people to migrate on every command
export function warnAboutLocalCLI(projectRoot: string, { localCmd }: { localCmd: string }) {
  // const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  // const useLocalCLI = boolish('EXPO_USE_LOCAL_CLI', true);
  // if (Versions.gteSdkVersion(exp, '46.0.0') && useLocalCLI) {
  //   Log.warn(
  //     chalk`\nThis command is being executed with the global Expo CLI. ${learnMore(
  //       'https://blog.expo.dev/the-new-expo-cli-f4250d8e3421'
  //     )}\nTo use the local CLI instead (recommended in SDK 46 and higher), run:\n\u203A {bold npx expo ${localCmd}}\n`
  //   );
  // }
}

export function warnMigration(toCommand: string) {
  Log.warn(chalk`\nMigrate to using:\n\u203A {bold ${toCommand}}\n`);
}
