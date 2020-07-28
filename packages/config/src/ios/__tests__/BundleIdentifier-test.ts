import { fs as memfs, vol } from 'memfs';
import path from 'path';

import { ExpoConfig } from '../../Config.types';
import {
  getBundleIdentifier,
  setBundleIdentifier,
  setBundleIdentifierForPbxproj,
} from '../BundleIdentifier';

const baseExpoConfig: ExpoConfig = {
  name: 'testproject',
  slug: 'testproject',
  platforms: ['ios'],
  version: '1.0.0',
};

jest.mock('fs');

const originalFs = jest.requireActual('fs');

describe('BundleIdentifier module', () => {
  describe(getBundleIdentifier, () => {
    it('returns null if no bundleIdentifier is provided', () => {
      expect(getBundleIdentifier(baseExpoConfig)).toBe(null);
    });

    it('returns the bundleIdentifier if provided', () => {
      expect(
        getBundleIdentifier({ ...baseExpoConfig, ios: { bundleIdentifier: 'com.example.xyz' } })
      ).toBe('com.example.xyz');
    });
  });

  describe(setBundleIdentifier, () => {
    it('sets the CFBundleShortVersionString if bundleIdentifier is given', () => {
      expect(
        setBundleIdentifier(
          { ...baseExpoConfig, ios: { bundleIdentifier: 'host.exp.exponent' } },
          {}
        )
      ).toMatchObject({
        CFBundleIdentifier: 'host.exp.exponent',
      });
    });

    it('makes no changes to the infoPlist no bundleIdentifier is provided', () => {
      expect(setBundleIdentifier(baseExpoConfig, {})).toMatchObject({});
    });
  });

  describe(setBundleIdentifierForPbxproj, () => {
    const projectRoot = '/testproject';
    const pbxProjPath = 'ios/testproject.xcodeproj/project.pbxproj';

    beforeEach(() => {
      vol.fromJSON(
        {
          [pbxProjPath]: originalFs.readFileSync(
            path.join(__dirname, 'fixtures/project.pbxproj'),
            'utf-8'
          ),
        },
        projectRoot
      );
    });
    afterEach(() => vol.reset());

    it('sets the bundle identifier in the pbxproj file', () => {
      setBundleIdentifierForPbxproj(projectRoot, 'com.swmansion.dominik.abcd.v2');
      const pbxprojContents = memfs.readFileSync(path.join(projectRoot, pbxProjPath), 'utf-8');
      expect(pbxprojContents).toMatchSnapshot();
    });
  });
});
