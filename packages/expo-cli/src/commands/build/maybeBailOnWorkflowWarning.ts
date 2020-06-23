import chalk from 'chalk';
import log from '../../log';
import * as ProjectUtils from '../utils/ProjectUtils';
import prompt from '../../prompt';

export default async function maybeBailOnWorkflowWarning({
  projectDir,
  platform,
  nonInteractive,
}: {
  projectDir: string;
  platform: 'ios' | 'android';
  nonInteractive: boolean;
}) {
  const { workflow } = await ProjectUtils.findProjectRootAsync(projectDir);
  if (workflow === 'managed') {
    return false;
  }

  const command = `expo build:${platform}`;
  log.warn(chalk.bold(`⚠️  ${command} currently only supports managed workflow apps.`));
  log.warn(
    `If you proceed with this command, we can run the build for you but it will not include any custom native modules or changes that you have made to your local native projects.`
  );
  log.warn(
    `Unless you are sure that you know what you are doing, we recommend aborting the build and doing a native release build through ${
      platform === 'ios' ? 'Xcode' : 'Android Studio'
    }.`
  );

  if (nonInteractive) {
    log.warn(`Skipping confirmation prompt because non-interactive mode is enabled.`);
    return false;
  }

  const answer = await prompt({
    type: 'confirm',
    name: 'ignoreWorkflowWarning',
    message: `Would you like to proceed?`,
  });

  return !answer.ignoreWorkflowWarning;
}
