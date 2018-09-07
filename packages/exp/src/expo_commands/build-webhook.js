import { URL } from 'url';
import { BuildWebhook, Exp } from 'xdl';
import chalk from 'chalk';

import log from '../log';

export default program => {
  program
    .command('build-webhook:set [project-dir]')
    .option('--url <webhook-url>', 'Webhook to be called after building the app.')
    .option(
      '--secret <webhook-secret>',
      'Secret to be passed as a query param (?secret=<webhook-secret>) to the Webhook. It has to be at least 16 characters long.'
    )
    .description(`Set the webhook for project to be called after finishing a standalone app build.`)
    .asyncActionProjectDir(async (projectDir, options) => {
      _ensureOptionsAreValid(options);

      const { args: { remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(
        projectDir
      );

      log(`Setting webhook and secret for ${experienceName}`);

      try {
        const webhook = {
          url: options.url,
          secret: options.secret,
        };
        await BuildWebhook.setBuildWebhookAsync(experienceName, webhook);
      } catch (e) {
        log.error(e);
        throw new Error('Unable to set webhook and secret for this project.');
      }

      log('All done!');
    }, true);

  program
    .command('build-webhook:fetch [project-dir]')
    .description(`Fetch the webhook for project.`)
    .asyncActionProjectDir(async (projectDir, options) => {
      const { args: { remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(
        projectDir
      );

      log(`Fetching webhook and secret for ${experienceName}`);

      try {
        const webhook = await BuildWebhook.getBuildWebhookAsync(experienceName);
        if (!webhook) {
          log(chalk.bold("You don't have any webhook set for this project."));
        } else {
          const { url, secret } = webhook;
          log(`Webhook URL: ${chalk.bold(url)}`);
          log(`Webhook secret: ${chalk.bold(secret)}`);
        }
      } catch (e) {
        log.error(e);
        throw new Error('Unable to fetch webhook and secret for this project.');
      }
    }, true);

  program
    .command('build-webhook:clear [project-dir]')
    .description(`Clear the webhook associated with project.`)
    .asyncActionProjectDir(async (projectDir, options) => {
      const { args: { remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(
        projectDir
      );

      log(`Clearing webhook and secret for ${experienceName}`);

      try {
        await BuildWebhook.deleteBuildWebhookAsync(experienceName);
      } catch (e) {
        log.error(e);
        throw new Error('Unable to clear webhook and secret for this project.');
      }
      log('All done!');
    }, true);
};

function _ensureOptionsAreValid(options) {
  const { url, secret } = options;

  if (!(url && secret)) {
    throw new Error('You must provide both --url and --secret');
  }

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
