import JsonFile from '@expo/json-file';
import crypto from 'crypto';
import fs from 'fs';
import fetch from 'node-fetch';
import os from 'os';

import { getStateJsonPath } from './paths';
import { getSession } from './sessionStorage';

const packageJSON = require('../package.json');

const xdlWriteKey = '1wabJGd5IiuF9Q8SGlcI90v8WTs';
const analyticsEndpoint = 'https://cdp.expo.dev/v1/batch';
const version = '1.0.0';
const library = 'create-expo-app';

//#region mostly copied from @expo/rudder-sdk-node https://github.com/expo/rudder-sdk-node/blob/main/index.ts
// some changes include:
// - the identity being injected inside of the enqueue method, rather than as a function argument.
// - a global event queue that gets cleared after each flush
// - using node's crypto library for hashing and uuidv4
type AnalyticsPayload = {
  messageId: string;
  _metadata: any;
  context: any;
  type: string;
  originalTimestamp: Date;
  [key: string]: any;
};
type AnalyticsMessage = {
  context?: {
    [key: string]: unknown;
  };
  integrations?: {
    [destination: string]: boolean;
  };
  properties?: {
    [key: string]: unknown;
  };
  timestamp?: Date;
  [key: string]: unknown;
};
type AnalyticsIdentity =
  | {
      userId: string;
    }
  | {
      userId?: string;
      anonymousId: string;
    };

const messageBatch = [] as AnalyticsPayload[];

let analyticsIdentity: AnalyticsIdentity | null = null;

// call before tracking any analytics events.
// if track/identify are called before this method they will be dropped
export async function initializeAnalyticsIdentityAsync() {
  if (analyticsIdentity) {
    return;
  }
  analyticsIdentity = await getAnalyticsIdentityAsync();
}

export function identify() {
  enqueue('identify', {});
}

export function track(
  message: AnalyticsMessage & {
    event: string;
  }
) {
  enqueue('track', { ...message, context: getAnalyticsContext() });
}

function enqueue(type: 'identify' | 'track', message: any) {
  if (!analyticsIdentity) {
    // do not send messages without identities to our backend
    return;
  }

  message = { ...message, ...analyticsIdentity };
  message.type = type;

  if (message.type === 'identify') {
    message.traits ??= {};
    message.context ??= {};
    message.context.traits = message.traits;
  }

  message.context = {
    library: {
      name: `@expo/expo-cli/${library}`,
      version,
    },
    ...message.context,
  };

  message._metadata = {
    nodeVersion: process.versions.node,
    ...message._metadata,
  };

  if (!message.originalTimestamp) {
    message.originalTimestamp = new Date();
  }

  if (!message.messageId) {
    // We md5 the messaage to add more randomness. This is primarily meant
    // for use in the browser where the uuid package falls back to Math.random()
    // which is not a great source of randomness.
    // Borrowed from analytics.js (https://github.com/segment-integrations/analytics.js-integration-segmentio/blob/a20d2a2d222aeb3ab2a8c7e72280f1df2618440e/lib/index.js#L255-L256).
    message.messageId = `node-${crypto
      .createHash('md5')
      .update(JSON.stringify(message))
      .digest('hex')}-${uuidv4()}`;
  }
  messageBatch.unshift(message);
}

export async function flushAsync() {
  if (!messageBatch.length) {
    return;
  }

  const request = {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json;charset=utf-8',
      'user-agent': `expo-expo-cli-${library}/${version}`,
      authorization: 'Basic ' + Buffer.from(`${xdlWriteKey}:`).toString('base64'),
    },
    body: JSON.stringify({
      batch: messageBatch.map(message => ({ ...message, sentAt: new Date() })),
      sentAt: new Date(),
    }),
  };
  await fetch(analyticsEndpoint, request);
  // clear array so we don't resend events in subsequent flushes
  messageBatch.splice(0, messageBatch.length);
}
//#endregion

//#region copied from eas cli https://github.com/expo/eas-cli/blob/f0c958e58bc7aa90ee8f822e075d40703563708e/packages/eas-cli/src/analytics/rudderstackClient.ts#L9-L13
const PLATFORM_TO_ANALYTICS_PLATFORM: { [platform: string]: string } = {
  darwin: 'Mac',
  win32: 'Windows',
  linux: 'Linux',
};

function getAnalyticsContext(): Record<string, any> {
  const platform = PLATFORM_TO_ANALYTICS_PLATFORM[os.platform()] || os.platform();
  return {
    os: { name: platform, version: os.release() },
    device: { type: platform, model: platform },
    app: { name: 'create expo app', version: packageJSON.version },
  };
}
//#endregion

function uuidv4() {
  // https://github.com/denoland/deno/issues/12754
  return (crypto as any).randomUUID();
}

export enum AnalyticsEventTypes {
  CREATE_EXPO_APP = 'create expo app',
}

export enum AnalyticsEventPhases {
  ATTEMPT = 'attempt',
  SUCCESS = 'success',
  FAIL = 'fail',
}

async function getAnalyticsIdentityAsync(): Promise<AnalyticsIdentity> {
  if (!fs.existsSync(getStateJsonPath())) {
    fs.writeFileSync(getStateJsonPath(), JSON.stringify({}));
  }
  const savedDeviceId = await JsonFile.getAsync(getStateJsonPath(), 'analyticsDeviceId', null);
  const deviceId = savedDeviceId ?? uuidv4();
  if (!savedDeviceId) {
    await JsonFile.setAsync(getStateJsonPath(), 'analyticsDeviceId', deviceId);
  }
  const userId = getSession()?.userId ?? null;
  return userId ? { anonymousId: deviceId, userId } : { anonymousId: deviceId };
}
