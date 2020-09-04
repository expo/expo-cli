import { ExpoConfig } from '@expo/config';
import axios from 'axios';

import { getSignedManifestStringAsync, getUnsignedManifestString } from '../ManifestHandler';

jest.mock('axios');

jest.mock('../../User', () => ({
  ensureLoggedInAsync: () => ({
    sessionSecret: 'SECRET',
  }),
}));

const mockManifest: ExpoConfig = {
  name: 'Hello',
  slug: 'hello-world',
  owner: 'ownername',
  version: '1.0.0',
  platforms: ['ios'],
};

const mockSignedManifestResponse = JSON.stringify({
  manifestString: JSON.stringify(mockManifest),
  signature: 'SIGNATURE_HERE',
  version: '1.0.0',
});

describe('getSignedManifestStringAsync', () => {
  it('calls the server API to sign a manifest', async () => {
    const requestFunction = axios.request as jest.MockedFunction<typeof axios.request>;
    requestFunction.mockReturnValueOnce(
      Promise.resolve({
        status: 200,
        data: { data: { response: mockSignedManifestResponse } },
      })
    );
    const manifestString = await getSignedManifestStringAsync(mockManifest, {
      sessionSecret: 'SECRET',
    });
    expect(manifestString).toBe(mockSignedManifestResponse);
    expect(requestFunction.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "args": Object {
            "remotePackageName": "hello-world",
            "remoteUsername": "ownername",
          },
          "manifest": Object {
            "name": "Hello",
            "owner": "ownername",
            "platforms": Array [
              "ios",
            ],
            "slug": "hello-world",
            "version": "1.0.0",
          },
        },
        "headers": Object {
          "Expo-Session": "SECRET",
          "Exponent-Client": "xdl",
        },
        "maxContentLength": 104857600,
        "method": "post",
        "url": "https://exp.host/--/api/v2/manifest/sign",
      }
    `);
  });
});

describe('getUnsignedManifestString', () => {
  it('returns a stringified manifest with the same shape a server-signed manifest', () => {
    expect(getUnsignedManifestString(mockManifest)).toMatchSnapshot();
  });
});
