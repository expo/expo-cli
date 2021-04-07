import { UserSettings } from '@expo/api';
import slugid from 'slugid';

function _newIdentifier(type = 'c') {
  return type + '-' + slugid.v4();
}

export async function clientIdAsync(): Promise<string> {
  let clientId = await UserSettings.getAsync('accessToken', null);
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
