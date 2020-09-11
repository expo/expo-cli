import { vol } from 'memfs';

import { CredentialsSource } from '../../../easJson';
import * as route from '../../route';
import iOSCredentialsProvider from '../iOSCredentialsProvider';

const appLookupParams = {
  projectName: 'slug123',
  accountName: 'owner123',
  bundleIdentifier: 'example.bundle.identifier',
};

const providerOptions = {
  nonInteractive: false,
  skipCredentialsCheck: false,
};

const mockGetDistCert = jest.fn();
const mockGetProvisioningProfile = jest.fn();

jest.mock('fs');
jest.mock('../../route');
jest.mock('../../context', () => {
  return {
    Context: jest.fn().mockImplementation(() => ({
      init: jest.fn(),
      ios: {
        getDistCert: mockGetDistCert,
        getProvisioningProfile: mockGetProvisioningProfile,
      },
    })),
  };
});
beforeEach(() => {
  mockGetDistCert.mockReset();
  mockGetProvisioningProfile.mockReset();
  vol.reset();
});

describe('iOSCredentialsProvider', () => {
  describe('when calling hasRemoteAsync', () => {
    it('should return true if credentials exists and are valid(basic validation)', async () => {
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'profileBase64',
        provisioningProfileId: 'id',
      }));
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'certbase64',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(true);
    });
    it('should return true if dist cert is missing', async () => {
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'profileBase64',
        provisioningProfileId: 'id',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(true);
    });

    it('should return true if provisioning profile is missing', async () => {
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'certbase64',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(true);
    });
    it('should return false if there are no credentials', async () => {
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(false);
    });
  });
  describe('when calling hasLocalAsync', () => {
    it('should return true if credentials exists and are valid(basic validation)', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'certPass',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });

      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(true);
    });
    it('should return true if there are missing fields', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              password: 'certPass',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });

      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(true);
    });
    it('should return true if file is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              password: 'certPass',
            },
          },
        }),
        './cert.p12': 'somebinarycontent2',
      });

      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(true);
    });
    it('should return false if there are no credentials.json file', async () => {
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(false);
    });
  });
  describe('when calling getCredentialsAsync with src=remote', () => {
    it('should not throw if credentials are valid', async () => {
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'profileBase64',
        provisioningProfileId: 'id',
      }));
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'certbase64',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(
        provider.getCredentialsAsync(CredentialsSource.REMOTE)
      ).resolves.not.toThrowError();
    });
    it('should return false if provisioning profile is missing', async () => {
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'certbase64',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.REMOTE)).rejects.toThrowError(
        'Provisioning profile is missing'
      );
    });
    it('should return false if dist cert is missging', async () => {
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'profileBase64',
        provisioningProfileId: 'id',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.REMOTE)).rejects.toThrowError(
        'Distribution certificate is missing'
      );
    });
    it('should return false if there are no credentials', async () => {
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.REMOTE)).rejects.toThrowError(
        'Distribution certificate is missing'
      );
    });
    it('should not run credentials manager if credentials check is skipped', async () => {
      const spy = jest.spyOn(route, 'runCredentialsManager').mockImplementation(() => {
        throw new Error("Shouldn't be called");
      });

      const provider = new iOSCredentialsProvider('.', appLookupParams, {
        ...providerOptions,
        skipCredentialsCheck: true,
      });
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.REMOTE)).rejects.toThrowError(
        'Distribution certificate is missing and credentials check was skipped. Run without --skip-credentials-check to set it up.'
      );

      spy.mockRestore();
    });
  });
  describe('when calling useLocalAsync', () => {
    it('should resolve sucesfully when credentials are valid', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'certPass',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });

      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(
        provider.getCredentialsAsync(CredentialsSource.LOCAL)
      ).resolves.not.toThrowError();
    });
    it('should throw error if there are missing fields', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.LOCAL)).rejects.toThrowError();
    });
    it('should throw error if file is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'certPass',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
      });
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.LOCAL)).rejects.toThrowError();
    });
    it('should return false if there are no credentials.json file', async () => {
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.LOCAL)).rejects.toThrowError();
    });
  });
  describe('when calling isLocalSyncedAsync', () => {
    it('should return true if credentials are the same', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'fakePassword',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        provisioningProfileId: 'id',
      }));
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'c29tZWJpbmFyeWNvbnRlbnQy',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const isLocalSynced = await provider.isLocalSyncedAsync();
      expect(isLocalSynced).toBe(true);
    });
    it('should return false if credentials are different', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'fakePassword',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        provisioningProfileId: 'id',
      }));
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'different cert',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      const isLocalSynced = await provider.isLocalSyncedAsync();
      expect(isLocalSynced).toBe(false);
    });
  });
  describe('when calling getCredetnials', () => {
    it('should return local values if useLocalAsync was called', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'certPassword',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        provisioningProfileId: 'id',
      }));
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'different cert',
        certPassword: 'fakePassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      expect(await provider.getCredentialsAsync(CredentialsSource.LOCAL)).toEqual({
        provisioningProfile: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        distributionCertificate: {
          certP12: 'c29tZWJpbmFyeWNvbnRlbnQy',
          certPassword: 'certPassword',
        },
      });
    });
    it('should return remote values if useRemoteAsync was called', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            provisioningProfilePath: 'pprofile',
            distributionCertificate: {
              path: 'cert.p12',
              password: 'fakePassword',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      mockGetProvisioningProfile.mockImplementation(() => ({
        provisioningProfile: 'remoteProvProfile',
        provisioningProfileId: 'id',
      }));
      mockGetDistCert.mockImplementation(() => ({
        certP12: 'remoteCert',
        certPassword: 'certPassword',
      }));
      const provider = new iOSCredentialsProvider('.', appLookupParams, providerOptions);
      await provider.initAsync();
      expect(await provider.getCredentialsAsync(CredentialsSource.REMOTE)).toEqual({
        provisioningProfile: 'remoteProvProfile',
        distributionCertificate: {
          certP12: 'remoteCert',
          certPassword: 'certPassword',
        },
      });
    });
  });
});
