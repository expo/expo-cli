import { UserSettings } from '@expo/xdl';
import prompt from './prompt';

async function askForSendToAsync(): Promise<string> {
  var sendToFromSettings = await UserSettings.getAsync('sendTo', null);
  console.log("Enter an email address and we'll send a link to your phone.");
  var answers = await prompt(
    [
      {
        type: 'input',
        name: 'sendTo',
        message:
          'Your email address' + (sendToFromSettings ? ' (space to not send anything)' : '') + ':',
        default: sendToFromSettings || undefined,
      },
    ],
    { nonInteractiveHelp: 'Please specify email address with --send-to.' }
  );
  let recipient = answers.sendTo.trim();
  await UserSettings.mergeAsync({ sendTo: recipient });
  return recipient;
}

export default {
  askForSendToAsync,
};

if (require.main === module) {
  askForSendToAsync().then(function (sendTo) {
    console.log('Your email address is', sendTo);
  });
}
