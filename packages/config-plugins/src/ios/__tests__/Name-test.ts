import { ExpoConfig } from '@expo/config-types';
import * as fs from 'fs';
import { vol } from 'memfs';
import * as path from 'path';

import { getName, setDisplayName, setName, setProductName } from '../Name';
import { getPbxproj, isBuildConfig, isNotComment } from '../utils/Xcodeproj';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');
jest.mock('../../utils/warnings');

describe('name', () => {
  it(`returns null if no bundleIdentifier is provided`, () => {
    expect(getName({} as any)).toBe(null);
  });

  it(`returns the name if provided`, () => {
    expect(getName({ name: 'Some iOS app' })).toBe('Some iOS app');
  });

  it(`sets the CFBundleDisplayName if name is given`, () => {
    expect(setDisplayName({ name: 'Expo app' }, {})).toMatchObject({
      CFBundleDisplayName: 'Expo app',
    });
  });

  it(`makes no changes to the infoPlist no name is provided`, () => {
    expect(setName({} as any, {})).toMatchObject({});
  });

  describe(setProductName, () => {
    const projectRoot = '/';
    beforeAll(async () => {
      vol.fromJSON(
        {
          'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
            path.join(__dirname, 'fixtures/project.pbxproj'),
            'utf-8'
          ),
          'ios/testproject/AppDelegate.m': '',
        },
        projectRoot
      );
    });

    afterAll(() => {
      vol.reset();
    });

    it(`sets the iOS PRODUCT_NAME value`, () => {
      // Ensure the value can be parsed and written.
      const project = setProductNameForRoot({ name: 'My Cool Thing', slug: '' }, projectRoot);
      expect(
        Object.entries(project.pbxXCBuildConfigurationSection())
          .filter(isNotComment)
          // @ts-ignore
          .filter(isBuildConfig)[0][1]?.buildSettings?.PRODUCT_NAME
        // Ensure the value is wrapped in quotes.
      ).toBe(`"My Cool Thing"`);
    });
  });
});

function setProductNameForRoot(config: ExpoConfig, projectRoot: string) {
  let project = getPbxproj(projectRoot);
  project = setProductName(config, project);
  fs.writeFileSync(project.filepath, project.writeSync());
  return project;
}
