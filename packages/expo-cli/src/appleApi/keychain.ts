import getenv from 'getenv';
// @ts-ignore
import keychain from 'keychain';

const KEYCHAIN_TYPE = 'internet';
const IS_MAC = process.platform === 'darwin';
const NO_PASSWORD_REGEX = /Could not find password/;

// When enabled, the password will not only be skipped but also deleted.
// This makes it easier to completely opt-out of Keychain functionality.
export const EXPO_NO_KEYCHAIN = getenv.boolish('EXPO_NO_KEYCHAIN', false);

type Credentials = {
  serviceName: string;
  username: string;
  password: string;
};

export function deletePasswordAsync({
  username,
  serviceName,
}: Pick<Credentials, 'username' | 'serviceName'>): Promise<boolean> {
  if (!IS_MAC) {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    keychain.deletePassword(
      { account: username, service: serviceName, type: KEYCHAIN_TYPE },
      (error: Error) => {
        if (error) {
          if (error.message.match(NO_PASSWORD_REGEX)) {
            return resolve(false);
          }
          reject(error);
        } else {
          resolve(true);
        }
      }
    );
  });
}

export function getPasswordAsync({
  username,
  serviceName,
}: Pick<Credentials, 'serviceName' | 'username'>): Promise<string | null> {
  if (!IS_MAC) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    keychain.getPassword(
      { account: username, service: serviceName, type: KEYCHAIN_TYPE },
      (error: Error, password: string) => {
        if (error) {
          if (error.message.match(NO_PASSWORD_REGEX)) {
            return resolve(null);
          }
          reject(error);
        } else {
          resolve(password);
        }
      }
    );
  });
}

export function setPasswordAsync({
  serviceName,
  username,
  password,
}: Credentials): Promise<boolean> {
  if (!IS_MAC) {
    return Promise.resolve(false);
  }
  return new Promise((resolve, reject) => {
    keychain.setPassword(
      { account: username, service: serviceName, password, type: KEYCHAIN_TYPE },
      (error: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      }
    );
  });
}
