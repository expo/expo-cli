import { getRemoteVersionsForSdk } from '../getRemoteVersionsForSdk';

jest.mock('os');
jest.mock('fs');
jest.unmock('@expo/dev-api');

describe(getRemoteVersionsForSdk, () => {
  it(`returns results for a valid SDK version`, async () => {
    const data = await getRemoteVersionsForSdk('43.0.0');
    expect(data).toBeDefined();
    expect(Object.keys(data).length).toBeGreaterThan(0);
    expect(typeof data['react-native']).toBe('string');
    expect(data.react).toEqual(data['react-dom']);
  });

  it(`returns an empty object for invalid SDK version`, async () => {
    const data = await getRemoteVersionsForSdk('Expo');
    expect(data).toBeDefined();
    expect(Object.keys(data).length).toBe(0);
  });

  it(`returns an empty object for unspecified SDK version`, async () => {
    const data = await getRemoteVersionsForSdk(undefined);
    expect(data).toBeDefined();
    expect(Object.keys(data).length).toBe(0);
  });
});
