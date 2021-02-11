import fs from 'fs';
import { vol } from 'memfs';
import path from 'path';

import { getApplicationTargetForSchemeAsync } from '../Target';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

describe(getApplicationTargetForSchemeAsync, () => {
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
      const target = await getApplicationTargetForSchemeAsync('/app', 'testproject');
      expect(target).toBe('testproject');
    });

    it('throws if the scheme does not exist', async () => {
      await expect(() =>
        getApplicationTargetForSchemeAsync('/app', 'nonexistentscheme')
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
      const target = await getApplicationTargetForSchemeAsync('/app', 'testproject');
      expect(target).toBe('testproject');
    });

    it('throws if the scheme does not exist', async () => {
      await expect(() =>
        getApplicationTargetForSchemeAsync('/app', 'nonexistentscheme')
      ).rejects.toThrow(/does not exist/);
    });
  });
});
