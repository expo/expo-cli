import { Command } from 'commander';
import boxen from 'boxen';

import chalk from 'chalk';

export default function (program: Command) {
  program
    .command('android [project-dir]')
    .description(chalk.yellow`Deprecated: Opens your app in Expo on a connected Android device`)
    .allowOffline()
    .asyncActionProjectDir(() => {
      // Deprecate after July 24, 2020 (3 months)
      console.log(
        boxen(
          chalk.yellow(
            `${chalk.bold(
              `expo android`
            )} is deprecated. You can open your project by:\n- Pressing ${chalk.bold`a`} in the ${chalk.bold`expo start`} terminal UI\n- Or by running ${chalk.bold`expo start --android`}`
          ),
          { borderColor: 'yellow', padding: 1 }
        )
      );
    });
}
