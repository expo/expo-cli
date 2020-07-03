import crypto from 'crypto';

import { Command } from 'commander';
import ora from 'ora';
import invariant from 'invariant';
import CliTable from 'cli-table3';
import { ApiV2, UserManager } from '@expo/xdl';
import { findConfigFile, getConfig } from '@expo/config';

import chalk from 'chalk';
import log from '../log';
import CommandError, { ErrorCodes } from '../CommandError';

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
    .command('webhooks [project-dir]')
    .description('List webhooks on a project.')
    .asyncActionProjectDir(listAsync);
  program
    .command('webhooks:add [project-dir]')
    .description('Add a webhook to a project.')
    .option('--url <url>', 'URL the webhook will request. (Required)')
    .option('--event <event-type>', 'Event type triggering the webhook. [build] (Required)')
    .option('--secret <secret>', 'Value used to sign the request with in Expo-Signature header.')
    .asyncActionProjectDir(addAsync);
  program
    .command('webhooks:remove [project-dir]')
    .option('--id <id>', 'ID of the webhook to remove.')
    .description('Remove a webhook from a project.')
    .asyncActionProjectDir(removeAsync);
  program
    .command('webhooks:update [project-dir]')
    .option('--id <id>', 'ID of the webhook to update.')
    .option('--url [url]', 'URL the webhook will request.')
    .option('--event [event-type]', 'Event type triggering the webhook. [build]')
    .option('--secret [secret]', 'Value used to sign the request with in Expo-Signature header.')
    .description('Update a webhook on a project.')
    .asyncActionProjectDir(updateAsync);
}

async function listAsync(projectRoot: string) {
  const { experienceName, project, client } = await setupAsync(projectRoot);

  const webhooks = await client.getAsync(`projects/${project.id}/webhooks`);
  if (webhooks.length) {
    const table = new CliTable({ head: ['Webhook ID', 'URL', 'Event'] });
    table.push(...webhooks.map((hook: Webhook) => [hook.id, hook.url, hook.event]));
    log(table.toString());
  } else {
    log(`${chalk.bold(experienceName)} has no webhooks.`);
    log('Use `expo webhooks:add` to add one.');
  }
}

async function addAsync(
  projectRoot: string,
  { url, event, ...options }: { url?: string; event?: WebhookEvent; secret?: string }
) {
  invariant(typeof url === 'string' && /^https?/.test(url), '--url: a HTTP URL is required');
  invariant(typeof event === 'string', '--event: string is required');
  const secret = validateSecret(options) || generateSecret();

  const { experienceName, project, client } = await setupAsync(projectRoot);

  const spinner = ora(`Adding webhook to ${experienceName}`).start();
  await client.postAsync(`projects/${project.id}/webhooks`, { url, event, secret });
  spinner.succeed();
}

async function updateAsync(
  projectRoot: string,
  {
    id,
    url,
    event,
    ...options
  }: { id?: string; url?: string; event?: WebhookEvent; secret?: string }
) {
  invariant(typeof id === 'string', '--id must be a  webhook ID');
  invariant(event == null || typeof event === 'string', '--event: string is required');
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
  invariant(typeof id === 'string', '--id must be a  webhook ID');
  const { project, client } = await setupAsync(projectRoot);

  await client.deleteAsync(`projects/${project.id}/webhooks/${id}`);
}

function validateSecret({ secret }: { secret?: string }): string | null {
  if (secret) {
    invariant(
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
  log(chalk.underline('Webhook signing secret:'));
  log(randomSecret);
  return randomSecret;
}

async function setupAsync(projectRoot: string) {
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
