import crayon from '@ccheever/crayon';

import {
  UrlUtils,
} from 'xdl';

import askUser from '../askUser';
import log from '../log';
import sendTo from '../sendTo';
import urlOpts from '../urlOpts';

async function action(projectDir, options) {
  await urlOpts.optsAsync(projectDir, options);

  let url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log("Your URL is\n\n" + crayon.underline(url) + "\n");
  log.raw(url);

  let shouldQuit = false;
  if (urlOpts.handleQROpt(url, options)) { shouldQuit = true; }
  if (await urlOpts.handleMobileOptsAsync(projectDir, url, options)) { shouldQuit = true; }

  if (shouldQuit) {
    return;
  }

  var recipient;
  if (typeof(options.sendTo) !== 'boolean') {
    recipient = options.sendTo;
  } else {
    recipient = await UserSettings.getAsync('sendTo', null);
  }

  if (!recipient) {
    recipient = await askUser.askForSendToAsync();
  }

  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  } else {
    log.gray("(Not sending anything because you didn't specify a recipient.)");
  }
}

export default (program) => {
  program
    .command('send [project-dir]')
    .description("Sends a link to your project to a phone number or e-mail address")
    //.help('You must have the server running for this command to work')
    .option('-s, --send-to', 'Specifies the mobile number or e-mail address to send this URL to')
    .urlOpts()
    .asyncActionProjectDir(action);
};
