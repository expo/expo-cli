import { URL } from 'url';
import { Webhooks, Exp } from 'xdl';
import chalk from 'chalk';
import _ from 'lodash';

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
      const { args: { remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(
        projectDir
      );

      log(`Setting webhook and secret for ${experienceName}`);
      try {
        await Webhooks.setWebhookAsync(experienceName, options);
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
      const { args: { remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(
        projectDir
      );

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
      const event = sanitizeEvent(options.event);
      const { args: { remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(
        projectDir
      );

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

function _sanitizeOptions(options, eventOnly = false) {
  const { url, secret, event: _event = 'build' } = options;

  const event = sanitizeEvent(_event, true);

  if (!(url && secret)) {
    if (!eventOnly) {
      throw new Error('You must provide both --url and --secret');
    }
  } else {
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(
          'The provided webhook URL is invalid and must be an absolute URL, including a scheme.'
        );
      } else {
        throw err;
      }
    }

    const secretString = String(secret);
    if (secretString.length < 16 || secretString.length > 1000) {
      throw new Error('Webhook secret has be at least 16 and not more than 1000 characters long');
    }
  }

  return { url, secret, event };
}

function sanitizeEvent(event, required = false) {
  if (!event) {
    if (required) {
      throw new Error('Webhook type has to be provided');
    } else {
      // we don't have anything to sanitize here, continue
      return event;
    }
  }

  if (!_.includes(WEBHOOK_TYPES, event)) {
    throw new Error(`Unsupported webhook type: ${event}`);
  }

  return event;
}
