import simpleSpinner from '@expo/simple-spinner';

import { Exp, UserSettings } from 'xdl';

import askUser from './askUser';
import log from './log';

async function getRecipient(sendTo) {
  let recipient;
  if (sendTo) {
    if (typeof sendTo !== 'boolean') {
      recipient = sendTo;
    } else {
      recipient = await UserSettings.getAsync('sendTo', null);
    }

    if (!recipient) {
      recipient = await askUser.askForSendToAsync();
    }
  }

  return recipient;
}

async function sendUrlAsync(url, recipient, allowUnauthed = false) {
  log('Sending URL to', recipient);
  simpleSpinner.start();
  try {
    var result = await Exp.sendAsync(recipient, url, allowUnauthed);
  } finally {
    simpleSpinner.stop();
  }
  log('Sent.');
  return result;
}

export default {
  getRecipient,
  sendUrlAsync,
};
