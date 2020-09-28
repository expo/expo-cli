import { getConfig } from '@expo/config';
import { Command } from 'commander';

import log from '../log';
import * as Dependencies from './utils/Dependencies';

async function action(projectDir: string) {
  const { exp, pkg } = getConfig(projectDir);

  const incompatibleDependencies = await Dependencies.listIncompatibleDependencies(
    projectDir,
    exp,
    pkg
  );

  if (incompatibleDependencies.length) {
    process.exit(1);
  }

  log.nested('✅ Dependencies appear to be compatible with your current SDK version');
  process.exit();
}

export default function (program: Command) {
  program
    .command('validate-dependencies [path]')
    .description('Validates project dependencies are compatible with Expo')
    .helpGroup('info')
    .asyncActionProjectDir(action);
}
