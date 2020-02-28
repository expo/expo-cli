const DISTRIBUTION_CERT = 'distributionCert';
const PUSH_KEY = 'pushKey';
const PUSH_CERT = 'pushCert';
const PROVISIONING_PROFILE = 'provisioningProfile';

export type Question = {
  question: string;
  type: 'file' | 'password' | 'string';
  base64Encode?: boolean;
};

export type Rule = {
  required: string[];
  name: string;
  id: string;
  canReuse?: boolean;
  migrationDocs?: string;
  dependsOn?: string;
  deprecated?: boolean;
  questions?: Record<string, Question>;
};

export type Condition = {
  or: Rule[];
};

const CREDENTIALS: Record<string, Rule> = {
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
const REQUIRED_CREDENTIALS = [
  CREDENTIALS.distributionCert,
  { or: [CREDENTIALS.pushKey, CREDENTIALS.pushCert] },
  CREDENTIALS.provisioningProfile,
];

const EXPO_WILL_GENERATE = 'EXPO_PLEASE_GENERATE_THIS_FOR_ME';

export {
  DISTRIBUTION_CERT,
  PUSH_KEY,
  PUSH_CERT,
  PROVISIONING_PROFILE,
  CREDENTIALS,
  REQUIRED_CREDENTIALS,
  EXPO_WILL_GENERATE,
};
