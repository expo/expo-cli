/* @flow */

import { authenticate } from '../appleApi';

export type Question = {
  question: string,
  type: 'file' | 'string' | 'password',
  base64Encode?: boolean,
};

export type CredentialSchema = {
  id: string,
  name: string,
  required: Array<string>,
  questions?: {
    [key: string]: Question,
  },
  deprecated?: boolean,
  migrationDocs?: string,
};

export class Context {
  projectDir: string = '';
  options: Object = {};
  hasProjectContext: boolean = false;
  manifest: any = {};
  user: any;

  apiClient: any;
  appleCtx: any;

  async ensureAppleCtx() {
    if (!this.appleCtx) {
      this.appleCtx = await authenticate(this.options);
    }
  }
}

export type IosCredentials = {
  appCredentials: Array<IosAppCredentials>,
  userCredentials: Array<IosPushCredentials | IosDistCredentials>,
};

export type IosAppCredentials = {
  appCredentialsId: number,
  experienceName: string,
  bundleIdentifier: string,

  provisioningProfileId?: string,
  provisioningProfile?: string,
  enterpriseAccount?: string,

  pushCredentialsId: number,
  distCredentialsId: number,

  // legacy (moved to userCredentials)
  teamId?: string,
  teamName?: string,
  pushP12?: string,
  pushPassword?: string,
  pushId?: string,
};

export type IosPushCredentials = {
  userCredentialsId: number,
  type: 'push-key',

  teamId?: string,
  teamName?: string,
  apnsKeyId: string,
  apnsKeyP8: string,
};

export type IosDistCredentials = {
  userCredentialsId: number,
  type: 'dist-cert',

  teamId?: string,
  teamName?: string,
  certId: string,
  certP12: string,
  certPassword: string,
  certPrivateSigningKey: string,
};

export type AndroidCredentials = {
  experienceName: string,

  keystore: string,
  keystorePassword: string,
  keyAlias: string,
  keyPassword: string,
};

export const DISTRIBUTION_CERT = 'distributionCert';
export const PUSH_KEY = 'pushKey';
export const PUSH_CERT = 'pushCert';
export const PROVISIONING_PROFILE = 'provisioningProfile';

export const credentialTypes: { [key: string]: CredentialSchema } = {
  [DISTRIBUTION_CERT]: {
    id: DISTRIBUTION_CERT,
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
  },
  [PUSH_KEY]: {
    id: PUSH_KEY,
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
  },
  [PROVISIONING_PROFILE]: {
    id: PROVISIONING_PROFILE,
    name: 'Apple Provisioning Profile',
    required: ['provisioningProfile'],
    dependsOn: DISTRIBUTION_CERT,
    questions: {
      provisioningProfile: {
        type: 'file',
        question: 'Path to .mobile provisioning profile:',
        base64Encode: true,
      },
    },
  },
  [PUSH_CERT]: {
    id: PUSH_CERT,
    name: 'Apple Push Notifications certificate',
    required: ['pushP12', 'pushPassword'],
    deprecated: true,
    migrationDocs:
      'https://docs.expo.io/versions/latest/distribution/building-standalone-apps/#switch-to-push-notification-key-on-ios',
  },
};

// Order of elements in the following array matters.
// We have to generate Distribution Certificate prior to generating Provisioning Profile.
export const REQUIRED_IOS_CREDENTIALS = [
  credentialTypes.distributionCert,
  { or: [credentialTypes.pushKey, credentialTypes.pushCert] },
  credentialTypes.provisioningProfile,
];

export const EXPO_WILL_GENERATE = 'EXPO_PLEASE_GENERATE_THIS_FOR_ME';
