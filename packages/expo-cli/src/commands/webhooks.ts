import { findConfigFile, getConfig } from '@expo/config';
import assert from 'assert';
import chalk from 'chalk';
import CliTable from 'cli-table3';
import type { Command } from 'commander';
import crypto from 'crypto';
import { ApiV2, UserManager } from 'xdl';

import CommandError, { ErrorCodes } from '../CommandError';
import Log from '../log';
import { ora } from '../utils/ora';

const SECRET_MIN_LENGTH = 16;
const SECRET_MAX_LENGTH = 1000;

type WebhookEvent = 'build';
type Webhook = {
  id: string;
  url: string;
  event: WebhookEvent;
  secret?: string;
};

export default function (program: Command) {
  program
    .command('webhooks [path]')
    .helpGroup('webhooks')
    .description('List all webhooks for a project')
    .asyncActionProjectDir(listAsync);
  program
    .command('webhooks:add [path]')
    .helpGroup('webhooks')
    .description('Add a webhook to a project')
    .option('--url <url>', 'URL to request. (Required)')
    .option('--event <event-type>', 'Event type that triggers the webhook. [build] (Required)')
    .option(
      '--secret <secret>',
      "Secret used to create a hash signature of the request payload, provided in the 'Expo-Signature' header."
    )
    .asyncActionProjectDir(addAsync);
  program
    .command('webhooks:remove [path]')
    .helpGroup('webhooks')
    .option('--id <id>', 'ID of the webhook to remove.')
    .description('Delete a webhook')
    .asyncActionProjectDir(removeAsync);
  program
    .command('webhooks:update [path]')
    .helpGroup('webhooks')
    .description('Update an existing webhook')
    .option('--id <id>', 'ID of the webhook to update.')
    .option('--url [url]', 'URL the webhook will request.')
    .option('--event [event-type]', 'Event type that triggers the webhook. [build]')
    .option(
      '--secret [secret]',
      "Secret used to create a hash signature of the request payload, provided in the 'Expo-Signature' header."
    )
    .asyncActionProjectDir(updateAsync);
}

async function listAsync(projectRoot: string) {
  const { experienceName, project, client } = await setupAsync(projectRoot);

  const webhooks = await client.getAsync(`projects/${project.id}/webhooks`);
  if (webhooks.length) {
    const table = new CliTable({ head: ['Webhook ID', 'URL', 'Event'] });
    table.push(...webhooks.map((hook: Webhook) => [hook.id, hook.url, hook.event]));
    Log.log(table.toString());
  } else {
    Log.log(`${chalk.bold(experienceName)} has no webhooks.`);
    Log.log('Use `expo webhooks:add` to add one.');
  }
}

async function addAsync(
  projectRoot: string,
  { url, event, ...options }: { url?: string; event?: WebhookEvent; secret?: string }
) {
  assert(typeof url === 'string' && /^https?/.test(url), '--url: a HTTP URL is required');
  assert(typeof event === 'string', '--event: string is required');
  const secret = validateSecret(options) || generateSecret();

  const { experienceName, project, client } = await setupAsync(projectRoot);

  const spinner = ora(`Adding webhook to ${experienceName}`).start();
  await client.postAsync(`projects/${project.id}/webhooks`, { url, event, secret });
  spinner.succeed();
}

export async function updateAsync(
  projectRoot: string,
  {
    id,
    url,
    event,
    ...options
  }: { id?: string; url?: string; event?: WebhookEvent; secret?: string }
) {
  assert(typeof id === 'string', '--id must be a webhook ID');
  assert(event == null || typeof event === 'string', '--event: string is required');
  let secret = validateSecret(options);

  const { project, client } = await setupAsync(projectRoot);

  const webhook = await client.getAsync(`projects/${project.id}/webhooks/${id}`);
  event = event ?? webhook.event;
  secret = secret ?? webhook.secret;

  const spinner = ora(`Updating webhook ${id}`).start();
  await client.patchAsync(`projects/${project.id}/webhooks/${id}`, { url, event, secret });
  spinner.succeed();
}

async function removeAsync(projectRoot: string, { id }: { id?: string }) {
  assert(typeof id === 'string', '--id must be a webhook ID');
  const { project, client } = await setupAsync(projectRoot);

  await client.deleteAsync(`projects/${project.id}/webhooks/${id}`);
}

function validateSecret({ secret }: { secret?: string }): string | null {
  if (secret) {
    assert(
      secret.length >= SECRET_MIN_LENGTH && secret.length < SECRET_MAX_LENGTH,
      `--secret: should be ${SECRET_MIN_LENGTH}-${SECRET_MAX_LENGTH} characters long`
    );
    return secret;
  }
  return null;
}

function generateSecret() {
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
    `Project ${experienceName} not found. The project is created the first time you run \`expo publish\` or build the project (https://docs.expo.io/distribution/building-standalone-apps/).`
  );
}
