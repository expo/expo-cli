import { Webhooks, Exp } from '@expo/xdl';
import chalk from 'chalk';
import inquirer from 'inquirer';
import validator from 'validator';

import log from '../log';

const WEBHOOK_TYPES = ['build'];

export default program => {
  program
    .command('webhooks:set [project-dir]')
    .option('--url <webhook-url>', 'Webhook to be called after building the app.')
    .option('--event <webhook-type>', 'Type of webhook: [build].')
    .option(
      '--secret <webhook-secret>',
      'Secret to be used to calculate the webhook request payload signature (check docs for more details). It has to be at least 16 characters long.'
    )
    .description(`Set a webhook for the project.`)
    .asyncActionProjectDir(async (projectDir, _options) => {
      const options = _sanitizeOptions(_options);
      const secret = options.secret ? options.secret : await _askForSecret();
      const webhookData = { ...options, secret };
      const {
        args: { remoteFullPackageName: experienceName },
      } = await Exp.getPublishInfoAsync(projectDir);
      log(`Setting ${webhookData.event} webhook and secret for ${experienceName}`);
      try {
        await Webhooks.setWebhookAsync(experienceName, webhookData);
      } catch (e) {
        log.error(e);
        throw new Error('Unable to set webhook and secret for this project.');
      }

      log('All done!');
    }, true);

  program
    .command('webhooks:show [project-dir]')
    .description(`Show webhooks for the project.`)
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: { remoteFullPackageName: experienceName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log(`Fetching webhooks for ${experienceName}`);

      try {
        const webhooks = await Webhooks.getWebhooksAsync(experienceName);
        if (!webhooks || webhooks.length === 0) {
          log(chalk.bold("You don't have any webhook set for this project."));
        } else {
          for (const webhook of webhooks) {
            const { event, url, secret } = webhook;
            log();
            log(`Webhook type: ${chalk.bold(event)}`);
            log(`Webhook URL: ${chalk.bold(url)}`);
            log(`Webhook secret: ${chalk.bold(secret)}`);
          }
        }
      } catch (e) {
        log.error(e);
        throw new Error('Unable to fetch webhooks for this project.');
      }
    }, true);

  program
    .command('webhooks:clear [project-dir]')
    .option('--event <webhook-type>', 'Type of webhook: [build].')
    .description(`Clear a webhook associated with this project.`)
    .asyncActionProjectDir(async (projectDir, options) => {
      const event = _sanitizeEvent(options.event);
      const {
        args: { remoteFullPackageName: experienceName },
      } = await Exp.getPublishInfoAsync(projectDir);

      log(`Clearing webhooks for ${experienceName}`);

      try {
        await Webhooks.deleteWebhooksAsync(experienceName, event);
      } catch (e) {
        log.error(e);
        throw new Error('Unable to clear webhook and secret for this project.');
      }
      log('All done!');
    }, true);
};

function _sanitizeOptions(options) {
  const { url, secret, event: _event = 'build' } = options;

  const event = _sanitizeEvent(_event, true);

  if (!url) {
    throw new Error('You must provide --url parameter');
  } else {
    const isValidUrl = validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
    });
    if (!isValidUrl) {
      throw new Error(
        'The provided webhook URL is invalid and must be an absolute URL, including a scheme.'
      );
    }

    if (secret) {
      const secretString = String(secret);
      if (secretString.length < 16 || secretString.length > 1000) {
        throw new Error('Webhook secret has be at least 16 and not more than 1000 characters long');
      }
    }
  }

  return { url, secret, event };
}

function _sanitizeEvent(event, required = false) {
  if (!event) {
    if (required) {
      throw new Error('Webhook type has to be provided');
    } else {
      // we don't have anything to sanitize here, continue
      return event;
    }
  }

  if (!WEBHOOK_TYPES.includes(event)) {
    throw new Error(`Unsupported webhook type: ${event}`);
  }

  return event;
}

async function _askForSecret() {
  const { secret } = await inquirer.prompt({
    type: 'password',
    name: 'secret',
    message: 'Webhook secret (at least 16 and not more than 1000 characters):',
  });
  if (secret.length < 16 || secret.length > 1000) {
    log.error('Webhook secret has be at least 16 and not more than 1000 characters long');
    return await _askForSecret();
  } else {
    return secret;
  }
}
