import { AndroidCredentials as Android } from '@expo/xdl';
import { CredentialSchema } from './actions/promptForCredentials';
import * as appleApi from '../appleApi'

// 
// iOS
//

export type IosCredentials = {
  appCredentials: IosAppCredentials[],
  userCredentials: (IosPushCredentials | IosDistCredentials)[],
};

export type TeamInfo = {
  teamId: string,
  teamName?: string,
}

export type IosAppCredentials = {
  experienceName: string,
  bundleIdentifier: string,

  pushCredentialsId?: number,
  distCredentialsId?: number,
  credentials: {
    provisioningProfileId?: string,
    provisioningProfile?: string,

    teamId?: string,
    teamName?: string,
    // legacy pushCert
    pushId?: string,
    pushP12?: string,
    pushPassword?: string,
  }
};

export type IosAllAppCredentials = IosAppCredentials & {
  pushCredentials?: appleApi.PushKey
}

export type IosPushCredentials = {
  id: number,
  type: 'push-key',
} & PushKey & TeamInfo;

export type PushKey = {
  apnsKeyId: string,
  apnsKeyP8: string,
}

export type IosDistCredentials = {
  id: number,
  type: 'dist-cert',
} & DistCert & TeamInfo;

export type DistCert = {
  certId?: string,
  certP12: string,
  certPassword: string,
  certPrivateSigningKey?: string,
  distCertSerialNumber?: string,
}


export const distCertSchema: CredentialSchema<appleApi.DistCert> = {
  id: 'distributionCert',
  canReuse: true,
  name: 'Apple Distribution Certificate',
  required: ['certP12', 'certPassword'],
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
  },
};

export const pushKeySchema: CredentialSchema<appleApi.PushKey> = {
  id: 'pushKey',
  canReuse: true,
  name: 'Apple Push Notifications service key',
  required: ['apnsKeyP8', 'apnsKeyId'],
  questions: {
    apnsKeyP8: {
      type: 'file',
      question: 'Path to P8 file:',
    },
    apnsKeyId: {
      type: 'string',
      question: 'Key ID:',
    },
  },
};


const provisioningProfileSchema: CredentialSchema<appleApi.ProvisioningProfile> = {
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

const pushCertSchema = {
  id: 'pushCert',
  name: 'Apple Push Notifications certificate',
  required: ['pushP12', 'pushPassword'],
  deprecated: true,
  migrationDocs:
  'https://docs.expo.io/versions/latest/distribution/building-standalone-apps/#switch-to-push-notification-key-on-ios',
};

//
// Android
//

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
  name: 'Android Keystore',
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
