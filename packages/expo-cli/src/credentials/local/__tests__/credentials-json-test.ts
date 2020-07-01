import { vol } from 'memfs';
import credentialsJson from '../credentialsJson';

jest.mock('fs');

beforeEach(() => {
  vol.reset();
});

describe('credentialsJson', () => {
  describe('readAndroidAsync', () => {
    it('should read android credentials if everything is correct', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: 'keystore.jks',
              keystorePassword: 'keystorePassword',
              keyAlias: 'keyAlias',
              keyPassword: 'keyPassword',
            },
          },
        }),
        'keystore.jks': 'somebinarydata',
      });
      const result = await credentialsJson.readAndroidAsync('.');
      expect(result).toEqual({
        keystore: {
          keystore: 'c29tZWJpbmFyeWRhdGE=',
          keystorePassword: 'keystorePassword',
          keyAlias: 'keyAlias',
          keyPassword: 'keyPassword',
        },
      });
    });
    it('should throw error when credentials.json is missing', async () => {
      const promise = credentialsJson.readAndroidAsync('.');
      await expect(promise).rejects.toThrow(
        'credentials.json must exist in the project root directory and consist a valid JSON'
      );
    });

    it('should throw error when android entry is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({}),
        'keystore.jks': 'somebinarydata',
      });
      const promise = credentialsJson.readAndroidAsync('.');
      await expect(promise).rejects.toThrow(
        'Android credentials are missing from credentials.json'
      );
    });
    it('should throw error when one of the required fields is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePassword: 'keystorePassword',
              keyAlias: 'keyAlias',
              keyPassword: 'keyPassword',
            },
          },
        }),
        'keystore.jks': 'somebinarydata',
      });
      const promise = credentialsJson.readAndroidAsync('.');
      await expect(promise).rejects.toThrow(
        'credentials.json is not valid [ValidationError: "android.keystore.keystorePath" is required]'
      );
    });
    it('should throw error when file specified in cedentials.json is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          android: {
            keystore: {
              keystorePath: 'keystore.jks',
              keystorePassword: 'keystorePassword',
              keyAlias: 'keyAlias',
              keyPassword: 'keyPassword',
            },
          },
        }),
      });
      const promise = credentialsJson.readAndroidAsync('.');
      await expect(promise).rejects.toThrow(
        "ENOENT: no such file or directory, open 'keystore.jks'"
      );
    });
  });

  describe('readIosAsync', () => {
    it('should read ios credentials if everything is correct', async () => {
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
      const result = await credentialsJson.readIosAsync('.');
      expect(result).toEqual({
        provisioningProfile: 'c29tZWJpbmFyeWNvbnRlbnQ=',
        distributionCertificate: {
          certP12: 'c29tZWJpbmFyeWNvbnRlbnQy',
          certPassword: 'certPass',
        },
      });
    });
    it('should throw error when credentials.json is missing', async () => {
      const promise = credentialsJson.readIosAsync('.');
      await expect(promise).rejects.toThrow(
        'credentials.json must exist in the project root directory and consist a valid JSON'
      );
    });
    it('should throw error if ios field is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({}),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      const promise = credentialsJson.readIosAsync('.');
      await expect(promise).rejects.toThrow('iOS credentials are missing from credentials.json');
    });
    it('should throw error if some field is missing', async () => {
      vol.fromJSON({
        './credentials.json': JSON.stringify({
          ios: {
            distributionCertificate: {
              path: 'cert.p12',
              password: 'certPass',
            },
          },
        }),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      const promise = credentialsJson.readIosAsync('.');
      await expect(promise).rejects.toThrow(
        'credentials.json is not valid [ValidationError: "ios.provisioningProfilePath" is required]'
      );
    });
    it('should throw error if dist cert file is missing', async () => {
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
      const promise = credentialsJson.readIosAsync('.');
      await expect(promise).rejects.toThrow("ENOENT: no such file or directory, open 'cert.p12'");
    });
    it('should throw error if provisioningProfile file is missing', async () => {
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
        './cert.p12': 'somebinarycontent2',
      });
      const promise = credentialsJson.readIosAsync('.');
      await expect(promise).rejects.toThrow("ENOENT: no such file or directory, open 'pprofile'");
    });
  });
});
