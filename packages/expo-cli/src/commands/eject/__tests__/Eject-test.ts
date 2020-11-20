import { vol } from 'memfs';

import {
  hashForDependencyMap,
  isPkgMainExpoAppEntry,
  resolveBareEntryFile,
  shouldDeleteMainField,
  stripDashes,
} from '../Eject';

jest.mock('fs');
jest.mock('resolve-from');

describe('stripDashes', () => {
  it(`removes spaces and dashes from a string`, () => {
    expect(stripDashes(' My cool-app ')).toBe('Mycoolapp');
    expect(stripDashes(' --- - ----- ')).toBe('');
    expect(stripDashes('-----')).toBe('');
    expect(stripDashes(' ')).toBe('');
    expect(stripDashes(' \n-\n-')).toBe('');
  });
});

describe('hashForDependencyMap', () => {
  it(`dependencies in any order hash to the same value`, () => {
    expect(hashForDependencyMap({ a: '1.0.0', b: 2, c: '~3.0' })).toBe(
      hashForDependencyMap({ c: '~3.0', b: 2, a: '1.0.0' })
    );
  });
});

describe(resolveBareEntryFile, () => {
  const projectRoot = '/alpha';
  const projectRootBeta = '/beta';

  beforeAll(() => {
    vol.fromJSON(
      {
        'index.js': '',
        'src/index.js': '',
      },
      projectRoot
    );
    vol.fromJSON(
      {
        'App.js': '',
      },
      projectRootBeta
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it(`resolves null when the app entry is managed`, () => {
    // managed entry points shouldn't even be searched in bare.
    expect(resolveBareEntryFile('/noop', 'node_modules/expo/AppEntry.js')).toEqual(null);
    expect(resolveBareEntryFile('/noop', 'expo/AppEntry.js')).toEqual(null);
  });
  it(`resolves to the provided main field`, () => {
    expect(resolveBareEntryFile(projectRoot, './src/index')).toEqual('/alpha/src/index.js');
    expect(resolveBareEntryFile(projectRoot, './index')).toEqual('/alpha/index.js');
    // Test that the "node_modules" aren't searched.
    expect(resolveBareEntryFile(projectRootBeta, 'App')).toEqual('/beta/App.js');
  });
  // Uses the default file if it exists and isn't defined in the package.json.
  it(`resolves to the existing default main file when no field is defined`, () => {
    expect(resolveBareEntryFile(projectRoot, null)).toEqual('/alpha/index.js');
  });
  // support crna blank template -- https://github.com/expo/expo-cli/issues/2873
  // no package.json main, but has a file that expo managed would resolve as the entry.
  // This tests that a valid managed entry isn't resolved in bare.
  it(`resolves to null when the default file doesn't exist`, () => {
    expect(resolveBareEntryFile(projectRootBeta, null)).toEqual(null);
  });
});

describe(resolveBareEntryFile, () => {
  const projectRoot = '/alpha';
  const projectRootBeta = '/beta';

  beforeAll(() => {
    vol.fromJSON(
      {
        'index.js': '',
        'src/index.js': '',
      },
      projectRoot
    );
    vol.fromJSON(
      {
        'App.ios.js': '',
      },
      projectRootBeta
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it(`resolves null when the app entry is managed`, () => {
    expect(resolveBareEntryFile('/noop', 'node_modules/expo/AppEntry.js')).toEqual(null);
    expect(resolveBareEntryFile('/noop', 'expo/AppEntry.js')).toEqual(null);
  });
  it(`resolves to the provided main field`, () => {
    expect(resolveBareEntryFile(projectRoot, './src/index')).toEqual('/alpha/src/index.js');
    expect(resolveBareEntryFile(projectRoot, './index')).toEqual('/alpha/index.js');
    expect(resolveBareEntryFile(projectRootBeta, 'App')).toEqual('/beta/App.ios.js');
  });
  it(`resolves to the existing default main file when no field is defined`, () => {
    expect(resolveBareEntryFile(projectRoot, null)).toEqual('/alpha/index.js');
  });
  it(`resolves to null when the default file doesn't exist`, () => {
    expect(resolveBareEntryFile(projectRootBeta, null)).toEqual(null);
  });
});

describe('shouldDeleteMainField', () => {
  it(`should delete non index field`, () => {
    expect(shouldDeleteMainField(null)).toBe(false);
    expect(shouldDeleteMainField()).toBe(false);
    expect(shouldDeleteMainField('expo/AppEntry')).toBe(true);
    // non-expo fields
    expect(shouldDeleteMainField('.src/other.js')).toBe(false);
    expect(shouldDeleteMainField('index.js')).toBe(false);
    expect(shouldDeleteMainField('index.ios.js')).toBe(false);
    expect(shouldDeleteMainField('index.ts')).toBe(false);
    expect(shouldDeleteMainField('./index')).toBe(false);
  });
});

describe('isPkgMainExpoAppEntry', () => {
  it(`matches expo app entry`, () => {
    expect(isPkgMainExpoAppEntry('./node_modules/expo/AppEntry.js')).toBe(true);
    expect(isPkgMainExpoAppEntry('./node_modules/expo/AppEntry')).toBe(true);
    expect(isPkgMainExpoAppEntry('expo/AppEntry.js')).toBe(true);
    expect(isPkgMainExpoAppEntry('expo/AppEntry')).toBe(true);
  });
  it(`doesn't match expo app entry`, () => {
    expect(isPkgMainExpoAppEntry()).toBe(false);
    expect(isPkgMainExpoAppEntry(null)).toBe(false);
    expect(isPkgMainExpoAppEntry('./expo/AppEntry')).toBe(false);
    expect(isPkgMainExpoAppEntry('./expo/AppEntry.js')).toBe(false);
  });
});
