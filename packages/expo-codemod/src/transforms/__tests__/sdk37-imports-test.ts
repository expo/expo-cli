// @ts-ignore
import { defineInlineTest } from 'jscodeshift/dist/testUtils';

import transform from '../sdk37-imports';

// Unchanged code
defineInlineTest(
  transform,
  {},
  `
  import { apisAreAvailable, Logs } from 'expo';
  import * as Expo from 'expo';
  `,
  `
  import { apisAreAvailable, Logs } from 'expo';
  import * as Expo from 'expo';
  `,
  'no changes'
);

// Non-trivial cases
defineInlineTest(
  transform,
  {},
  `
  import { AuthSession, ScreenOrientation } from 'expo';
  `,
  `
  import * as AuthSession from 'expo-auth-session';
  import * as ScreenOrientation from 'expo-screen-orientation';
  `,
  'auth session and screen orientation'
);
defineInlineTest(
  transform,
  {},
  `
  import { Updates, AuthSession } from 'expo';
  `,
  `
  import { Updates } from 'expo';
  import * as AuthSession from 'expo-auth-session';
`,
  'expo import should remain'
);
defineInlineTest(
  transform,
  {},
  `
  // @flow
  import { AuthSession } from 'expo';
  `,
  `
  // @flow
  import * as AuthSession from 'expo-auth-session';
`,
  'retain comment on first line'
);
