import { resolveEntryPoint } from '@expo/xdl/build/tools/resolveEntryPoint';
import chalk from 'chalk';
import { Command } from 'commander';
import path from 'path';

import { buildAsync } from './esbuild/service';

export default function (program: Command) {
  program
    .command('ios [project-dir]')
    .description(
      chalk.yellow`Deprecated: Opens your app in Expo in an iOS simulator on your computer`
    )
    .allowOffline()
    .asyncActionProjectDir(async (projectRoot: string) => {
      const platform = process.env.EXPO_PLATFORM ?? 'ios';

      const filename = resolveEntryPoint(projectRoot, platform);
      // const contents = await readFile(filename, 'utf8');
      // console.log(filename, contents);
      await buildAsync(
        projectRoot,
        path.resolve(filename),
        platform,
        path.join(projectRoot, `public/index.${platform}.js`)
      );
      // console.log(data);
    });
}
