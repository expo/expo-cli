import fs from 'fs';
import { vol } from 'memfs';
import path from 'path';

import {
  getApplicationTargetNameForSchemeAsync,
  getArchiveBuildConfigurationForSchemeAsync,
} from '../BuildScheme';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

describe(getApplicationTargetNameForSchemeAsync, () => {
  describe('single build action entry', () => {
    beforeAll(async () => {
      vol.fromJSON(
        {
          'ios/testproject.xcodeproj/xcshareddata/xcschemes/testproject.xcscheme': fsReal.readFileSync(
            path.join(__dirname, 'fixtures/testproject.xcscheme'),
            'utf-8'
          ),
        },
        '/app'
      );
    });

    afterAll(() => {
      vol.reset();
    });

    it('returns the target name for existing scheme', async () => {
      const target = await getApplicationTargetNameForSchemeAsync('/app', 'testproject');
      expect(target).toBe('testproject');
    });

    it('throws if the scheme does not exist', async () => {
      await expect(() =>
        getApplicationTargetNameForSchemeAsync('/app', 'nonexistentscheme')
      ).rejects.toThrow(/does not exist/);
    });
  });
  describe('multiple build action entries', () => {
    beforeAll(async () => {
      vol.fromJSON(
        {
          'ios/testproject.xcodeproj/xcshareddata/xcschemes/testproject.xcscheme': fsReal.readFileSync(
            path.join(__dirname, 'fixtures/testproject-2.xcscheme'),
            'utf-8'
          ),
        },
        '/app'
      );
    });

    afterAll(() => {
      vol.reset();
    });

    it('returns the target name for existing scheme', async () => {
      const target = await getApplicationTargetNameForSchemeAsync('/app', 'testproject');
      expect(target).toBe('testproject');
    });

    it('throws if the scheme does not exist', async () => {
      await expect(() =>
        getApplicationTargetNameForSchemeAsync('/app', 'nonexistentscheme')
      ).rejects.toThrow(/does not exist/);
    });
  });
});

describe(getArchiveBuildConfigurationForSchemeAsync, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/xcshareddata/xcschemes/testproject.xcscheme': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/testproject.xcscheme'),
          'utf-8'
        ),
      },
      '/app'
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('returns build configuration name for existing scheme', async () => {
    const buildConfiguration = await getArchiveBuildConfigurationForSchemeAsync(
      '/app',
      'testproject'
    );
    expect(buildConfiguration).toBe('Release');
  });

  it('throws if the scheme does not exist', async () => {
    await expect(() =>
      getArchiveBuildConfigurationForSchemeAsync('/app', 'nonexistentscheme')
    ).rejects.toThrow(/does not exist/);
  });
});
