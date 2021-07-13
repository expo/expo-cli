import { AndroidCredentials as Android } from 'xdl';

import * as appleApi from '../appleApi';
import { CredentialSchema } from './actions/promptForCredentials';

//
// iOS
//

export type IosCredentials = {
  appCredentials: IosAppCredentials[];
  userCredentials: (IosPushCredentials | IosDistCredentials)[];
};

export type IosAppCredentials = {
  experienceName: string;
  bundleIdentifier: string;

  pushCredentialsId?: number;
  distCredentialsId?: number;
  credentials: {
    provisioningProfileId?: string;
    provisioningProfile?: string;

    teamId?: string;
    teamName?: string;
    // legacy pushCert
    pushId?: string;
    pushP12?: string;
    pushPassword?: string;
  };
};

export type IosPushCredentials = {
  id: number;
  type: 'push-key';
} & appleApi.PushKey;

export type IosDistCredentials = {
  id: number;
  type: 'dist-cert';
} & appleApi.DistCert;

export const distCertSchema: CredentialSchema<appleApi.DistCert> = {
  id: 'distributionCert',
  canReuse: true,
  name: 'Apple Distribution Certificate',
  required: ['certP12', 'certPassword', 'teamId'],
  questions: {
    certP12: {
      question: 'Path to P12 file:',
      type: 'file',
      base64Encode: true,
    },
    certPassword: {
      type: 'password',
      question: 'P12 password:',
    },
    teamId: {
      type: 'string',
      question: 'Apple Team ID:',
    },
  },
};

export const pushKeySchema: CredentialSchema<appleApi.PushKey> = {
  id: 'pushKey',
  canReuse: true,
  name: 'Apple Push Notifications service key',
  required: ['apnsKeyP8', 'apnsKeyId', 'teamId'],
  questions: {
    apnsKeyP8: {
      type: 'file',
      question: 'Path to P8 file:',
    },
    apnsKeyId: {
      type: 'string',
      question: 'Key ID:',
    },
    teamId: {
      type: 'string',
      question: 'Apple Team ID:',
    },
  },
};

export const provisioningProfileSchema: CredentialSchema<appleApi.ProvisioningProfile> = {
  id: 'provisioningProfile',
  name: 'Apple Provisioning Profile',
  required: ['provisioningProfile'],
  dependsOn: 'distributionCert',
  questions: {
    provisioningProfile: {
      type: 'file',
      question: 'Path to .mobile provisioning profile:',
      base64Encode: true,
    },
  },
};

export const appleTeamSchema: CredentialSchema<Pick<appleApi.Team, 'id'>> = {
  id: 'team',
  name: 'Apple Team',
  required: ['id'],
  questions: {
    id: {
      type: 'string',
      question: 'Apple Team ID:',
    },
  },
};

//
// Android
//

export type FcmCredentials = {
  fcmApiKey: string;
};

export type Keystore = Android.Keystore;

export type AndroidCredentials = {
  experienceName: string;
  keystore: Keystore | null;
  pushCredentials: FcmCredentials | null;
};

export const keystoreSchema: CredentialSchema<Android.Keystore> = {
  id: 'keystore',
  name: 'Android Keystore',
  provideMethodQuestion: {
    question: `Would you like to upload a Keystore or have us generate one for you?\nIf you don't know what this means, let us generate it! :)`,
    expoGenerated: 'Generate new keystore',
    userProvided: 'I want to upload my own file',
  },
  required: ['keystore', 'keystorePassword', 'keyAlias', 'keyPassword'],
  questions: {
    keystore: {
      question: 'Path to the Keystore file.',
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
