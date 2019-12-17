import { Command } from 'commander';
import { readConfigJsonAsync } from '@expo/config';

import log from '../log';

export async function action(projectDir = './') {
  const { exp } = await readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  // Everything after this is a redirect for the deprecated optimize command
  log.warn(
    '\u203A The expo optimize command is no longer included in expo-cli, please refer to the expo-optimize README at https://git.io/Je9h6 for a drop-in replacement.'
  );
}

export default function(program: Command) {
  program
    .command('optimize [project-dir]')
    .alias('o')
    .description('Compress the assets in your Expo project')
    .option('-s, --save', 'Save the original assets with a .orig extension')
    .option(
      '--quality [number]',
      'Specify the quality the compressed image is reduced to. Default is 80'
    )
    .option(
      '--include [pattern]',
      'Include only assets that match this glob pattern relative to the project root'
    )
    .option(
      '--exclude [pattern]',
      'Exclude all assets that match this glob pattern relative to the project root'
    )
    .allowOffline()
    .asyncAction(action);
}
