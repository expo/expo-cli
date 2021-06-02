import { User } from 'xdl';

export const jester: User = {
  kind: 'user',
  username: 'jester',
  nickname: 'jester',
  userId: 'jester-id',
  picture: 'jester-pic',
  userMetadata: { onboarded: true },
  currentConnection: 'Username-Password-Authentication',
  sessionSecret: 'jester-secret',
};

export const jester2: User = {
  kind: 'user',
  username: 'jester2',
  nickname: 'jester2',
  userId: 'jester2-id',
  picture: 'jester2-pic',
  userMetadata: { onboarded: true },
  currentConnection: 'Username-Password-Authentication',
  sessionSecret: 'jester2-secret',
};

export const testUsername = jester.username;
export const testSlug = 'testApp';
export const testBundleIdentifier = 'test.com.app';
export const testPackageName = 'test.com.app';
export const testExperienceName = `@${testUsername}/${testSlug}`;
export const testJester2ExperienceName = `@${jester2.username}/${testSlug}`;
export const testAppLookupParams = {
  accountName: testUsername,
  projectName: testSlug,
  bundleIdentifier: testBundleIdentifier,
};

export const testAppJson = {
  name: 'testing 123',
  version: '0.1.0',
  slug: testSlug,
  sdkVersion: '38.0.0',
  ios: { bundleIdentifier: testBundleIdentifier },
};

export const testAppJsonWithDifferentOwner = {
  ...testAppJson,
  owner: jester2.username,
};
