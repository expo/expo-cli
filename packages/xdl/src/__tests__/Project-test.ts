import { ExpoConfig } from '@expo/config';
import { AxiosRequestConfig } from 'axios';

import { getSignedManifestStringAsync, getUnsignedManifestString } from '../Project';

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

jest.mock('axios', () => ({
  request: jest.fn(async (options: AxiosRequestConfig) => {
    if (options.url.endsWith('/--/api/v2/manifest/sign')) {
      expect(options.data.args).toEqual({
        remoteUsername: mockManifest.owner,
        remotePackageName: mockManifest.slug,
      });
      expect(options.data.manifest).toEqual(mockManifest);
      const data = { data: { response: mockSignedManifestResponse } };
      return { status: 200, data };
    } else {
      throw new Error('Test tried to make a request to unmocked endpoint (' + options.url + ')');
    }
  }),
}));

describe('getSignedManifestStringAsync', () => {
  it('calls the server API to sign a manifest', async () => {
    const manifestString = await getSignedManifestStringAsync(mockManifest, {
      sessionSecret: 'SECRET',
    });
    expect(manifestString).toBe(mockSignedManifestResponse);
  });
});

describe('getUnsignedManifestString', () => {
  it('returns a stringified manifest with the same shape a server-signed manifest', () => {
    expect(getUnsignedManifestString(mockManifest)).toMatchSnapshot();
  });
});
