var simpleSpinner = require('@exponent/simple-spinner');

import {
  Exp,
  UserSettings,
} from 'xdl';

var askUser = require('./askUser');
var log = require('./log');

async function getRecipient(sendTo) {
  let recipient;
  if (sendTo) {
    if (typeof(sendTo) !== 'boolean') {
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

async function sendUrlAsync(url, recipient) {
  log("Sending URL to", recipient);
  simpleSpinner.start();
  try {
    var result = await Exp.sendAsync(recipient, url);
  } finally {
    simpleSpinner.stop();
  }
  log("Sent.");
  return result;
}

module.exports = {
  getRecipient,
  sendUrlAsync,
}
