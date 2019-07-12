import { AndroidCredentials as Android } from '@expo/xdl';
import { CredentialSchema } from './actions/promptForCredentials';

export type FcmCredentials = {
  fcmApiKey: string
}

export type AndroidCredentials = {
  experienceName: string,
  keystore: Android.Keystore | null,
  pushCredentials: FcmCredentials | null,
};

export const keystoreSchema: CredentialSchema<Android.Keystore> = {
  id: 'keystore',
  name: 'Android keystore',
  required: ['keystore', 'keystorePassword', 'keyAlias', 'keyPassword'],
  questions: {
    keystore: {
      question: 'Path to keystore file.',
      type: 'file',
      base64Encode: true,
    },
    keystorePassword: {
      question: 'Keystore password',
      type: 'password',
    },
    keyAlias: {
      question: 'Key alias',
      type: 'string',
    },
    keyPassword: {
      question: 'Key password',
      type: 'password',
    },
  },
};


export const EXPO_WILL_GENERATE = 'EXPO_PLEASE_GENERATE_THIS_FOR_ME';
