import { getConfig } from '@expo/config';
import chalk from 'chalk';
import { boolish } from 'getenv';
import { Versions } from 'xdl';

import Log from '../log';

export function warnAboutLocalCLI(projectRoot: string, { localCmd }: { localCmd: string }) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const useLocalCLI = boolish('EXPO_USE_LOCAL_CLI', true);
  if (Versions.gteSdkVersion(exp, '46.0.0') && useLocalCLI) {
    Log.warn(chalk`\n\nMigrate to the local CLI command:\n\u203A {bold npx expo ${localCmd}}\n`);
  }
}

export function warnMigration(toCommand: string) {
  Log.warn(chalk`\nMigrate to using:\n\u203A {bold ${toCommand}}\n`);
}
