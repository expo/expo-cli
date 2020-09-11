import { vol } from 'memfs';

import { CredentialsSource } from '../../../easJson';
import AndroidCredentialsProvider from '../AndroidCredentialsProvider';

const providerOptions = {
  projectName: 'slug123',
  accountName: 'owner123',
};
const cliOptions = {
  nonInteractive: false,
};

const mockFetchKeystore = jest.fn();

jest.mock('fs');
jest.mock('../../route');
jest.mock('../../context', () => {
  return {
    Context: jest.fn().mockImplementation(() => ({
      init: jest.fn(),
      android: {
        fetchKeystore: mockFetchKeystore,
      },
    })),
  };
});
beforeEach(() => {
  mockFetchKeystore.mockReset();
  vol.reset();
});

describe('AndroidCredentialsProvider', () => {
  describe('when calling hasRemoteAsync', () => {
    it('should return true if credentials exists and are valid(basic validation)', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'base64kesytoredata',
        keystorePassword: 'pass1',
        keyAlias: 'alias1',
        keyPassword: 'keypass',
      }));
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(true);
    });
    it('should return false if there are missing fields', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'base64kesytoredata',
        keystorePassword: 'pass1',
        keyPassword: 'keypass',
      }));
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(false);
    });
    it('should return false if there are no credentials', async () => {
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasRemote = await provider.hasRemoteAsync();
      expect(hasRemote).toBe(false);
    });
  });
  describe('when calling hasLocalAsync', () => {
    it('should return true if credentials exists and are valid(basic validation)', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keystorePassword: 'pass1',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
        './test.jks': 'somebinarycontent',
      });

      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(true);
    });
    it('should return true if there are missing fields', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
        './test.jks': 'somebinarycontent',
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(true);
    });
    it('should return true if file is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keystorePassword: 'pass1',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(true);
    });
    it('should return false if there are no credentials.json file', async () => {
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const hasLocal = await provider.hasLocalAsync();
      expect(hasLocal).toBe(false);
    });
  });
  describe('when calling getCredentialsAsync with src remote', () => {
    it('should not throw if credentials are valid', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'base64kesytoredata',
        keystorePassword: 'pass1',
        keyAlias: 'alias1',
        keyPassword: 'keypass',
      }));
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(
        provider.getCredentialsAsync(CredentialsSource.REMOTE)
      ).resolves.not.toThrowError();
    });
    it('should return false if there are missing fields', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'base64kesytoredata',
        keystorePassword: 'pass1',
        keyPassword: 'keypass',
      }));
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.REMOTE)).rejects.toThrowError();
    });
    it('should return false if there are no credentials', async () => {
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.REMOTE)).rejects.toThrowError();
    });
  });
  describe('when calling useLocalAsync', () => {
    it('should resolve sucesfully when credentials are valid', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keystorePassword: 'pass1',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
        './test.jks': 'somebinarycontent',
      });

      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(
        provider.getCredentialsAsync(CredentialsSource.LOCAL)
      ).resolves.not.toThrowError();
    });
    it('should throw error if there are missing fields', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
        './test.jks': 'somebinarycontent',
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.LOCAL)).rejects.toThrowError();
    });
    it('should throw error if file is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keystorePassword: 'pass1',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.LOCAL)).rejects.toThrowError();
    });
    it('should return false if there are no credentials.json file', async () => {
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      await expect(provider.getCredentialsAsync(CredentialsSource.LOCAL)).rejects.toThrowError();
    });
  });
  describe('when calling isLocalSyncedAsync', () => {
    it('should return true if credentials are the same', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        keystorePassword: 'pass1',
        keyAlias: 'alias1',
        keyPassword: 'keypass',
      }));
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test.jks',
              keystorePassword: 'pass1',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
        './test.jks': 'somebinarycontent',
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const isLocalSynced = await provider.isLocalSyncedAsync();
      expect(isLocalSynced).toBe(true);
    });
    it('should return false if credentials are different', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        keystorePassword: 'pass1',
        keyAlias: 'alias1',
        keyPassword: 'keypass',
      }));
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test2.jks',
              keystorePassword: 'pass2',
              keyAlias: 'alias1',
              keyPassword: 'keypass',
            },
          },
        }),
        './test2.jks': 'somebinarycontent',
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      const isLocalSynced = await provider.isLocalSyncedAsync();
      expect(isLocalSynced).toBe(false);
    });
  });
  describe('when calling getCredetnials', () => {
    it('should return local values if useLocalAsync was called', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        keystorePassword: 'pass1',
        keyAlias: 'alias1',
        keyPassword: 'keypass',
      }));
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test2.jks',
              keystorePassword: 'pass2',
              keyAlias: 'aliaslocal',
              keyPassword: 'keypass',
            },
          },
        }),
        './test2.jks': 'somebinarycontent',
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      expect(await provider.getCredentialsAsync(CredentialsSource.LOCAL)).toEqual({
        keystore: {
          keystore: 'c29tZWJpbmFyeWNvbnRlbnQ=',
          keystorePassword: 'pass2',
          keyAlias: 'aliaslocal',
          keyPassword: 'keypass',
        },
      });
    });
    it('should return remote values if useRemoteAsync was called', async () => {
      mockFetchKeystore.mockImplementation(() => ({
        keystore: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        keystorePassword: 'pass1',
        keyAlias: 'alias1',
        keyPassword: 'keypass',
      }));
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: './test2.jks',
              keystorePassword: 'pass2',
              keyAlias: 'aliaslocal',
              keyPassword: 'keypass',
            },
          },
        }),
        './test2.jks': 'somebinarycontent',
      });
      const provider = new AndroidCredentialsProvider('.', providerOptions, cliOptions);
      await provider.initAsync();
      expect(await provider.getCredentialsAsync(CredentialsSource.REMOTE)).toEqual({
        keystore: {
          keystore: 'c29tZWJpbmFyeWNvbnRlbnQ=',
          keystorePassword: 'pass1',
          keyAlias: 'alias1',
          keyPassword: 'keypass',
        },
      });
    });
  });
});
