import { ProjectPrivacy } from '@expo/config';
import { ApiV2, User } from '@expo/xdl';
import ora from 'ora';

import log from './log';

interface ProjectData {
  accountName: string;
  projectName: string;
  privacy?: ProjectPrivacy;
}

async function ensureProjectExistsAsync(
  user: User,
  { accountName, projectName, privacy }: ProjectData
): Promise<string> {
  const projectFullName = `@${accountName}/${projectName}`;

  const spinner = ora(
    `Ensuring project ${log.chalk.bold(projectFullName)} is registered on Expo servers`
  ).start();

  const client = ApiV2.clientForUser(user);
  try {
    const [{ id }] = await client.getAsync('projects', { experienceName: projectFullName });
    spinner.succeed();
    return id;
  } catch (err) {
    if (err.code !== 'EXPERIENCE_NOT_FOUND') {
      spinner.fail(
        `Something went wrong when looking for project ${log.chalk.bold(
          projectFullName
        )} on Expo servers`
      );
      throw err;
    }
  }
  try {
    spinner.text = `Registering project ${log.chalk.bold(projectFullName)} on Expo servers`;
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

export { ensureProjectExistsAsync };
