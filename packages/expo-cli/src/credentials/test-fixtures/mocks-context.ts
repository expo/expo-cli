import merge from 'lodash/merge';

import { getAndroidApiMock } from './mocks-android';
import { testAppJson, testUsername } from './mocks-constants';
import { appleCtxMock, getIosApiMock } from './mocks-ios';

export function getCtxMock(mockOverride: { [key: string]: any } = {}) {
  const defaultMock = {
    ios: getIosApiMock(),
    android: getAndroidApiMock(),
    appleCtx: appleCtxMock,
    ensureAppleCtx: jest.fn(),
    user: {
      username: testUsername,
    },
    hasAppleCtx: jest.fn(() => true),
    hasProjectContext: true,
    manifest: testAppJson,
    projectDir: '.',
  };
  return merge(defaultMock, mockOverride);
}
