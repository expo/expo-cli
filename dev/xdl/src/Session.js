/**
 * @flow
 */

import slugid from 'slugid';

import UserSettings from './UserSettings';

function _newIdentifier(type = 'c') {
  return type + '-' + slugid.v4();
}

export async function clientIdAsync() {
  var clientId = await UserSettings.getAsync('accessToken', null);
  if (clientId === null) {
    clientId = _newIdentifier();
    await setClientIdAsync(clientId);
  }
  return clientId;
}

export async function setClientIdAsync(token: string) {
  await UserSettings.setAsync('accessToken', token);
  return token;
}
