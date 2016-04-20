var slugid = require('slugid');

var UserSettings = require('./UserSettings');

function _newIdentifier(type='c') {
  return type + '-' + slugid.v4();
}

async function clientIdAsync() {
  var clientId = await UserSettings.getAsync('clientId', null);
  if (clientId === null) {
    clientId = _newIdentifier();
    await setClientIdAsync(clientId);
  }
  return clientId;
}

async function setClientIdAsync(token) {
  await UserSettings.setAsync('clientId', token);
  return token;
}

module.exports = {
  clientIdAsync,
  setClientIdAsync,
};
