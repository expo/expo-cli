import { addMapsCocoaPods, getGoogleMapsApiKey, setGoogleMapsApiKey } from '../Maps';
import { PodfileBasic } from './fixtures/Podfile';

describe(getGoogleMapsApiKey, () => {
  it(`returns null from all getters if no value provided`, () => {
    expect(getGoogleMapsApiKey({})).toBe(null);
  });

  it(`returns the correct values from all getters if a value is provided`, () => {
    expect(getGoogleMapsApiKey({ ios: { config: { googleMapsApiKey: '123' } } })).toBe('123');
  });
});
describe(getGoogleMapsApiKey, () => {
  it(`sets the google maps api key if provided or returns plist`, () => {
    expect(setGoogleMapsApiKey({ ios: { config: { googleMapsApiKey: '123' } } }, {})).toMatchObject(
      {
        GMSApiKey: '123',
      }
    );

    expect(setGoogleMapsApiKey({}, {})).toMatchObject({});
  });
});

describe(addMapsCocoaPods, () => {
  it(`adds maps pods to Podfile`, () => {
    const results = addMapsCocoaPods(PodfileBasic, true);
    // matches a static snapshot
    expect(results.contents).toMatchSnapshot();
    // did add new content
    expect(results.didMerge).toBe(true);
    // didn't remove old content
    expect(results.didClear).toBe(false);

    const modded = addMapsCocoaPods(results.contents, false);
    // doesn't have the old hash
    expect(modded.contents).not.toMatch(/5c87ad4d9ddfb7bd69df4fc0cf28e520c23ac94b/);
    // does have the new hash
    expect(modded.contents).toMatch(/68a7fa3da70aeb22eb1be85cf1a635c7a6c53b86/);
    // added new content
    expect(modded.didMerge).toBe(true);
    // removed old content
    expect(modded.didClear).toBe(true);

    const modded2 = addMapsCocoaPods(modded.contents, false);
    expect(modded2.contents).toMatch(/68a7fa3da70aeb22eb1be85cf1a635c7a6c53b86/);
    // didn't add new content
    expect(modded2.didMerge).toBe(false);
    // didn't remove old content
    expect(modded2.didClear).toBe(false);
  });
});
