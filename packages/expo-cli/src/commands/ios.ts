import boxen from 'boxen';
import chalk from 'chalk';
import { Command } from 'commander';

export default function (program: Command) {
  program
    .command('ios [project-dir]')
    .description(
      chalk.yellow`Deprecated: Opens your app in Expo in an iOS simulator on your computer`
    )
    .allowOffline()
    .asyncActionProjectDir(() => {
      // Deprecate after July 24, 2020 (3 months)
      console.log(
        boxen(
          chalk.yellow(
            `${chalk.bold(
              `expo ios`
            )} is deprecated. You can open your project by:\n- Pressing ${chalk.bold`i`} in the ${chalk.bold`expo start`} terminal UI\n- Or by running ${chalk.bold`expo start --ios`}`
          ),
          { borderColor: 'yellow', padding: 1 }
        )
      );
    });
}
