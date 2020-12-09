import { ExpoConfig } from '@expo/config-types';
import { fs as memfs, vol } from 'memfs';
import path from 'path';

import {
  getBundleIdentifier,
  getBundleIdentifierFromPbxproj,
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

  describe(getBundleIdentifierFromPbxproj, () => {
    const projectRoot = '/testproject';

    afterEach(() => vol.reset());

    it('returns null if no project.pbxproj exists', () => {
      vol.mkdirpSync(projectRoot);
      expect(getBundleIdentifierFromPbxproj(projectRoot)).toBeNull();
    });

    it('returns the bundle identifier defined in project.pbxproj', () => {
      vol.fromJSON(
        {
          'ios/testproject.xcodeproj/project.pbxproj': originalFs.readFileSync(
            path.join(__dirname, 'fixtures/project.pbxproj'),
            'utf-8'
          ),
        },
        projectRoot
      );
      expect(getBundleIdentifierFromPbxproj(projectRoot)).toBe('org.name.testproject');
    });

    it('returns the bundle identifier for the first native target in project.pbxproj (project initialized with react-native init)', () => {
      vol.fromJSON(
        {
          'ios/testproject.xcodeproj/project.pbxproj': originalFs.readFileSync(
            path.join(__dirname, 'fixtures/project-rni.pbxproj'),
            'utf-8'
          ),
        },
        projectRoot
      );
      expect(getBundleIdentifierFromPbxproj(projectRoot)).toBe('org.reactjs.native.example.rni');
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
    const otherPbxProjPath = 'ios/otherproject.xcodeproj/project.pbxproj';

    beforeEach(() => {
      vol.fromJSON(
        {
          [pbxProjPath]: originalFs.readFileSync(
            path.join(__dirname, 'fixtures/project.pbxproj'),
            'utf-8'
          ),
          [otherPbxProjPath]: originalFs.readFileSync(
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
      const otherPbxprojContents = memfs.readFileSync(
        path.join(projectRoot, otherPbxProjPath),
        'utf-8'
      );
      expect(pbxprojContents).toMatchSnapshot();
      // Ensure all paths are modified
      expect(pbxprojContents).toBe(otherPbxprojContents);
    });
  });
});
