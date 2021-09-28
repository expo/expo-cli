import { findConfigFile, getConfig } from '@expo/config';
import assert from 'assert';
import chalk from 'chalk';
import crypto from 'crypto';
import { ApiV2, UserManager } from 'xdl';

import CommandError, { ErrorCodes } from '../../CommandError';
import Log from '../../log';

const SECRET_MIN_LENGTH = 16;
const SECRET_MAX_LENGTH = 1000;

export type WebhookEvent = 'build';

export function validateSecret({ secret }: { secret?: string }): string | null {
  if (secret) {
    assert(
      secret.length >= SECRET_MIN_LENGTH && secret.length < SECRET_MAX_LENGTH,
      `--secret: should be ${SECRET_MIN_LENGTH}-${SECRET_MAX_LENGTH} characters long`
    );
    return secret;
  }
  return null;
}

export function generateSecret() {
  // Create a 60 characters long secret from 30 random bytes.
  const randomSecret = crypto.randomBytes(30).toString('hex');
  Log.log(chalk.underline('Webhook signing secret:'));
  Log.log(randomSecret);
  return randomSecret;
}

export async function setupAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const { slug } = exp;
  if (!slug) {
    throw new CommandError(
      ErrorCodes.MISSING_SLUG,
      `expo.slug is not defined in ${findConfigFile(projectRoot).configName}`
    );
  }
  const user = await UserManager.ensureLoggedInAsync();
  const client = ApiV2.clientForUser(user);
  const experienceName = `@${exp.owner ?? user.username}/${exp.slug}`;
  try {
    const projects = await client.getAsync('projects', {
      experienceName,
    });
    if (projects.length === 0) {
      throw projectNotFoundError(experienceName);
    }
    const project = projects[0];
    return { experienceName, project, client };
  } catch (error) {
    if (error.code === 'EXPERIENCE_NOT_FOUND') {
      throw projectNotFoundError(experienceName);
    } else {
      throw error;
    }
  }
}

function projectNotFoundError(experienceName: string) {
  return new CommandError(
    ErrorCodes.PROJECT_NOT_FOUND,
    `Project ${experienceName} not found. The project is created the first time you run \`expo publish\` or build the project (https://docs.expo.dev/distribution/building-standalone-apps/).`
  );
}
