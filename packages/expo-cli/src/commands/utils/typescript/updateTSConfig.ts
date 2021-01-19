import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import { boolish } from 'getenv';

import log from '../../../log';
import { baseTSConfigName, resolveBaseTSConfig } from './resolveModules';

const TS_FEATURE_FLAG = 'EXPO_NO_TYPESCRIPT_SETUP';

export const isTypeScriptSetupDisabled = boolish(TS_FEATURE_FLAG, false);

export async function updateTSConfigAsync({
  projectRoot,
  tsConfigPath,
  isBootstrapping,
}: {
  projectRoot: string;
  tsConfigPath: string;
  isBootstrapping: boolean;
}): Promise<void> {
  if (isBootstrapping) {
    await JsonFile.writeAsync(tsConfigPath, {});
  }

  const projectTSConfig = JsonFile.read(tsConfigPath, {
    // Some tsconfig.json files have a generated comment in the file.
    json5: true,
  });
  if (projectTSConfig.compilerOptions == null) {
    projectTSConfig.compilerOptions = {};
    isBootstrapping = true;
  }

  const modifications: [string, string][] = [];

  // If the default TSConfig template exists (SDK +41), then use it in the project
  const hasTemplateTsconfig = resolveBaseTSConfig(projectRoot);
  if (hasTemplateTsconfig) {
    if (projectTSConfig.extends !== baseTSConfigName) {
      projectTSConfig.extends = baseTSConfigName;
      modifications.push(['extends', baseTSConfigName]);
    }
  } else if (isBootstrapping) {
    // TODO: Maybe don't do this
    // SDK -40 or expo isn't installed.
    projectTSConfig.compilerOptions = {
      allowSyntheticDefaultImports: true,
      jsx: 'react-native',
      lib: ['dom', 'esnext'],
      moduleResolution: 'node',
      noEmit: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      // @ts-ignore
      ...(projectTSConfig.compilerOptions || {}),
    };
  }

  // Ensure the project is excluding node modules.
  if (!Array.isArray(projectTSConfig.exclude)) {
    projectTSConfig.exclude = [];
  }

  if (!projectTSConfig.exclude.find(v => String(v).includes('node_modules'))) {
    projectTSConfig.exclude.push('node_modules');
    const formatArray = (array: string[]) => array.join(', ');
    modifications.push(['exclude', formatArray(projectTSConfig.exclude as string[])]);
  }

  // If no changes, then quietly bail out
  if (!modifications.length) {
    return;
  }

  // Write changes and log out a summary of what changed
  await JsonFile.writeAsync(tsConfigPath, projectTSConfig);

  log.addNewLineIfNone();

  if (isBootstrapping) {
    log(`${chalk.bold`TypeScript`}: A ${chalk.cyan('tsconfig.json')} has been auto generated`);
    log.newLine();
    return;
  }

  log(
    `${chalk.bold`TypeScript`}: The ${chalk.cyan(
      'tsconfig.json'
    )} has been updated ${chalk.dim`(Use ${TS_FEATURE_FLAG} to skip)`}`
  );
  log.newLine();

  log(`\u203A ${chalk.bold('Required')} modifications made to the ${chalk.cyan('tsconfig.json')}:`);

  log.newLine();

  // Sort the items based on key name length
  printTable(modifications.sort((a, b) => a[0].length - b[0].length));

  log.newLine();
}

function printTable(items: string[][]) {
  const tableFormat = (name: string, msg: string) =>
    `  ${chalk.bold`${name}`} is now ${chalk.cyan(msg)}`;
  for (const [key, value] of items) {
    log(tableFormat(key, value));
  }
}
