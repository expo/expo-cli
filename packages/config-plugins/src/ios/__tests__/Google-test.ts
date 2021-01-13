import {
  getGoogleMapsApiKey,
  getGoogleServicesFile,
  getGoogleSignInReservedClientId,
  setGoogleMapsApiKey,
  setGoogleSignInReservedClientId,
} from '../Google';
import { appendScheme } from '../Scheme';

jest.mock('../Scheme');

describe('ios google config', () => {
  it(`returns null from all getters if no value provided`, () => {
    expect(getGoogleMapsApiKey({})).toBe(null);
    expect(getGoogleSignInReservedClientId({})).toBe(null);
    expect(getGoogleServicesFile({})).toBe(null);
  });

  it(`returns the correct values from all getters if a value is provided`, () => {
    expect(getGoogleMapsApiKey({ ios: { config: { googleMapsApiKey: '123' } } })).toBe('123');

    expect(
      getGoogleSignInReservedClientId({
        ios: { config: { googleSignIn: { reservedClientId: '000' } } },
      })
    ).toBe('000');
    expect(
      getGoogleServicesFile({ ios: { googleServicesFile: './path/to/GoogleService-Info.plist' } })
    ).toBe('./path/to/GoogleService-Info.plist');
  });

  it(`sets the google maps api key if provided or returns plist`, () => {
    expect(setGoogleMapsApiKey({ ios: { config: { googleMapsApiKey: '123' } } }, {})).toMatchObject(
      {
        GMSApiKey: '123',
      }
    );

    expect(setGoogleMapsApiKey({}, {})).toMatchObject({});
  });

  it(`adds the reserved client id to scheme if provided`, () => {
    const infoPlist = {};
    setGoogleSignInReservedClientId(
      {
        ios: { config: { googleSignIn: { reservedClientId: 'client-id-scheme' } } },
      },
      infoPlist
    );
    expect(appendScheme).toHaveBeenCalledWith('client-id-scheme', infoPlist);
  });
});
