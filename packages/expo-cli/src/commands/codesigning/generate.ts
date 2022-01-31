import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('codesigning:generate [path]')
      .helpGroup('codesigning')
      .description('Generate expo-updates code signing keys and certificates')
      .option(
        '-o, --output <directory>',
        'Directory in which to put the generated keys and certificate'
      )
      .option('-d, --validity-duration-years <years>', 'Validity duration in years')
      .option('-c, --common-name <name>', 'Common name attribute for certificate'),
    () => import('./generateCodeSigningAsync')
  );
}
