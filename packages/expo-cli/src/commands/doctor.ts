import { Command } from 'commander';
import { Doctor } from '@expo/xdl';

import log from '../log';

async function action(projectDir: string) {
  if ((await Doctor.validateWithNetworkAsync(projectDir)) === Doctor.NO_ISSUES) {
    log(`Didn't find any issues with your project!`);
  }
  process.exit();
}

export default function (program: Command) {
  program
    .command('doctor [project-dir]')
    .description('Diagnoses issues with your Expo project.')
    .asyncActionProjectDir(action);
}
