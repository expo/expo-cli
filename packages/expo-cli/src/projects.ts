import { ApiV2, RobotUser, User } from '@expo/api';
import { ExpoConfig, ProjectPrivacy } from '@expo/config';

import CommandError from './CommandError';
import Log from './log';
import { ora } from './utils/ora';

interface ProjectData {
  accountName: string;
  projectName: string;
  privacy?: ProjectPrivacy;
}

async function ensureProjectExistsAsync(
  user: User | RobotUser,
  { accountName, projectName, privacy }: ProjectData
): Promise<string> {
  const projectFullName = `@${accountName}/${projectName}`;

  const spinner = ora(
    `Ensuring project ${Log.chalk.bold(projectFullName)} is registered on Expo servers`
  ).start();

  const client = ApiV2.clientForUser(user);
  try {
    const [{ id }] = await client.getAsync('projects', { experienceName: projectFullName });
    spinner.succeed();
    return id;
  } catch (err) {
    if (err.code !== 'EXPERIENCE_NOT_FOUND') {
      spinner.fail(
        `Something went wrong when looking for project ${Log.chalk.bold(
          projectFullName
        )} on Expo servers`
      );
      throw err;
    }
  }
  try {
    spinner.text = `Registering project ${Log.chalk.bold(projectFullName)} on Expo servers`;
    const { id } = await client.postAsync('projects', {
      accountName,
      projectName,
      privacy: privacy || ProjectPrivacy.PUBLIC,
    });
    spinner.succeed();
    return id;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

/**
 * Get the account and project name using a user and Expo config.
 * This will validate if the owner field is set when using a robot account.
 */
function getProjectOwner(user: User | RobotUser, exp: ExpoConfig): string {
  if (user.kind === 'robot' && !exp.owner) {
    throw new CommandError(
      'ROBOT_OWNER_ERROR',
      'The "owner" manifest property is required when using robot users. See: https://docs.expo.io/versions/latest/config/app/#owner'
    );
  }

  return exp.owner || user.username;
}

export { ensureProjectExistsAsync, getProjectOwner };
