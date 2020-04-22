import { getCustomInfoPlistEntries, setCustomInfoPlistEntries } from '../CustomInfoPlistEntries';

const customInfoPlistEntries = {
  LSApplicationQueriesSchemes: ['lyft'],
  NSCameraUsageDescription: 'This app uses the camera to scan barcodes on event tickets.',
};

describe('custom Info.plist entries', () => {
  it(`returns empty object if none provided`, () => {
    expect(getCustomInfoPlistEntries({})).toEqual({});
  });

  it(`returns entries if provided`, () => {
    expect(
      getCustomInfoPlistEntries({
        ios: {
          infoPlist: customInfoPlistEntries,
        },
      })
    ).toBe(customInfoPlistEntries);
  });

  it(`sets the entries on the provided plist object if given`, () => {
    const baseInfoPlist = { CFBundleDisplayName: 'My App' };
    let result = setCustomInfoPlistEntries(
      { ios: { infoPlist: customInfoPlistEntries } },
      baseInfoPlist
    );
    expect(result.CFBundleDisplayName).toEqual(baseInfoPlist.CFBundleDisplayName);
    Object.keys(customInfoPlistEntries).forEach(key => {
      expect(result[key]).toEqual(customInfoPlistEntries[key]);
    });
  });

  it(`makes no changes to the plist object if no custom entries are provided`, () => {
    expect(setCustomInfoPlistEntries({}, {})).toMatchObject({});
  });
});
