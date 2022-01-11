import { UserSettings } from '@expo/api';
import { v4 as uuidv4 } from 'uuid';

function _newIdentifier(type = 'c') {
  const bytes = uuidv4(null, Buffer.alloc(16));
  const base64 = bytes.toString('base64');
  const slug = base64
    // Replace + with - (see RFC 4648, sec. 5)
    .replace(/\+/g, '-')
    // Replace / with _ (see RFC 4648, sec. 5)
    .replace(/\//g, '_')
    // Drop '==' padding
    .substring(0, 22);
  return type + '_' + slug;
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
