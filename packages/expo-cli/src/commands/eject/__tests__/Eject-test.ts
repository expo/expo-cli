import {
  hashForDependencyMap,
  isPkgMainExpoAppEntry,
  shouldDeleteMainField,
  stripDashes,
} from '../Eject';

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
