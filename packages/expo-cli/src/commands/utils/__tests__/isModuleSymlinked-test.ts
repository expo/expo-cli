import { vol } from 'memfs';

import { isModuleSymlinked } from '../isModuleSymlinked';

jest.mock('fs');
jest.mock('resolve-from', () => {
  return jest.fn((projectRoot, moduleId) => {
    return moduleId === 'expo'
      ? projectRoot + '/node_modules/expo/build/index.js'
      : projectRoot + '/packages/expo-custom/build/index.js';
  });
});

describe(isModuleSymlinked, () => {
  const projectRoot = '/expo/apps/native-component-list';

  beforeAll(() => {
    vol.fromJSON({
      [projectRoot + '/packages/expo-custom/package.json']: '{}',
      [projectRoot + '/packages/expo-custom/build/index.js']: '',
      [projectRoot + '/node_modules/expo/package.json']: '{}',
      [projectRoot + '/node_modules/expo/build/index.js']: '',
    });
  });

  afterAll(() => {
    vol.reset();
  });

  it(`returns false for a module that is not symlinked`, () => {
    expect(
      isModuleSymlinked({
        projectRoot,
        moduleId: 'expo',
        isSilent: false,
      })
    ).toBe(false);
  });
  it(`returns true for a module that is symlinked`, () => {
    expect(
      isModuleSymlinked({
        projectRoot,
        moduleId: 'expo-custom',
        isSilent: false,
      })
    ).toBe(true);
  });
});
