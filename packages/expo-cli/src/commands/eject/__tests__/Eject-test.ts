import { isPkgMainExpoAppEntry, stripDashes } from '../Eject';

describe('stripDashes', () => {
  it(`removes spaces and dashes from a string`, () => {
    expect(stripDashes(' My cool-app ')).toBe('Mycoolapp');
    expect(stripDashes(' --- - ----- ')).toBe('');
    expect(stripDashes('-----')).toBe('');
    expect(stripDashes(' ')).toBe('');
    expect(stripDashes(' \n-\n-')).toBe('');
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
