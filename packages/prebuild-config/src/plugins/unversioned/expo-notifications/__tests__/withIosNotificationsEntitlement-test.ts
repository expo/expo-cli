import { vol } from 'memfs';

import { isExpoNotificationsInstalled } from '../withIosNotificationsEntitlement';

jest.mock('fs');

const projectRoot = '/app';

describe('Android notifications configuration', () => {
  beforeAll(async () => {
    vol.fromJSON(
      { './node_modules/expo-notifications/package.json': JSON.stringify({}) },
      projectRoot
    );
  });

  afterEach(() => {
    // jest.unmock('@expo/image-utils');
    // jest.unmock('fs');
    vol.reset();
  });

  it(`returns path if expo-notifications/package.json exists`, () => {
    vol.fromJSON(
      { './node_modules/expo-notifications/package.json': JSON.stringify({}) },
      projectRoot
    );
    expect(isExpoNotificationsInstalled(projectRoot)).toBe('/app/node_modules/expo-notifications');
  });
  it(`returns null if expo-notifications/package.json does not exist`, () => {
    vol.fromJSON({ './node_modules/expo-notifications/index.js': JSON.stringify({}) }, projectRoot);
    expect(isExpoNotificationsInstalled(projectRoot)).toBe(null);
  });
});
