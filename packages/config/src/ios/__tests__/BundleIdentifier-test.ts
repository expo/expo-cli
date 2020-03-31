import { getBundleIdentifier, setBundleIdentifier } from '../BundleIdentifier';

describe('bundle identifier', () => {
  it(`returns null if no bundleIdentifier is provided`, () => {
    expect(getBundleIdentifier({})).toBe(null);
  });

  it(`returns the bundleIdentifier if provided`, () => {
    expect(getBundleIdentifier({ ios: { bundleIdentifier: 'com.example.xyz' } })).toBe(
      'com.example.xyz'
    );
  });

  it(`sets the CFBundleShortVersionString if bundleIdentifier is given`, () => {
    expect(
      setBundleIdentifier({ ios: { bundleIdentifier: 'host.exp.exponent' } }, {})
    ).toMatchObject({
      CFBundleIdentifier: 'host.exp.exponent',
    });
  });

  it(`makes no changes to the infoPlist no bundleIdentifier is provided`, () => {
    expect(setBundleIdentifier({}, {})).toMatchObject({});
  });
});

// TODO
xdescribe('updating pbxproject', () => {});
