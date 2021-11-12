import fs from 'fs-extra';
import { vol } from 'memfs';

import prompts from '../../../utils/prompts';
import { testKeystore } from '../../__tests__/fixtures/mocks-android';
import { testExperienceName } from '../../__tests__/fixtures/mocks-constants';
import { getCtxMock } from '../../__tests__/fixtures/mocks-context';
import { testAllCredentialsForApp } from '../../__tests__/fixtures/mocks-ios';
import * as credentialsJsonUpdateUtils from '../update';

jest.mock('fs');
jest.mock('../../../utils/prompts');

beforeEach(() => {
  vol.reset();
  (prompts as any).mockReset();
  (prompts as any).mockImplementation(() => {
    throw new Error('Should not be called');
  });
});

describe('update credentials.json', () => {
  describe('updateAndroidCredentialsAsync', () => {
    it('should update keystore and credentials.json if www returns valid credentials', async () => {
      const ctx = getCtxMock();
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
      await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
      const keystore = await fs.readFile('./keystore.jks', 'base64');
      const credJson = await fs.readJson('./credentials.json');
      expect(keystore).toEqual(testKeystore.keystore);
      expect(credJson).toEqual({
        android: {
          keystore: {
            keystorePath: 'keystore.jks',
            keystorePassword: testKeystore.keystorePassword,
            keyAlias: testKeystore.keyAlias,
            keyPassword: testKeystore.keyPassword,
          },
        },
      });
    });
    it('should create credentials.json and keystore if credentials.json does not exist', async () => {
      const ctx = getCtxMock();
      await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
      const keystore = await fs.readFile('./android/keystores/keystore.jks', 'base64');
      const credJson = await fs.readJson('./credentials.json');
      expect(keystore).toEqual(testKeystore.keystore);
      expect(credJson).toEqual({
        android: {
          keystore: {
            keystorePath: 'android/keystores/keystore.jks',
            keystorePassword: testKeystore.keystorePassword,
            keyAlias: testKeystore.keyAlias,
            keyPassword: testKeystore.keyPassword,
          },
        },
      });
    });
    it('should not do anything if keystore in www is missing', async () => {
      const ctx = getCtxMock({
        android: {
          fetchKeystore: () => null,
        },
      });
      const credJson = {
        android: {
          keystore: {
            keystorePath: 'keystore.jks',
            keystorePassword: 'keystorePassword',
            keyAlias: 'keyAlias',
            keyPassword: 'keyPassword',
          },
        },
      };
      vol.fromJSON({
        './credentials.json': JSON.stringify(credJson),
        'keystore.jks': 'somebinarydata',
      });
      await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
      const keystore = await fs.readFile('./keystore.jks', 'base64');
      const newCredJson = await fs.readJson('./credentials.json');
      expect(keystore).toEqual('c29tZWJpbmFyeWRhdGE='); // base64 "somebinarydata"
      expect(newCredJson).toEqual(credJson);
    });
    it('should update keystore and credentials.json if android part of credentials.json is not valid', async () => {
      const ctx = getCtxMock();
      vol.fromJSON({
        './credentials.json': JSON.stringify({ android: { test: '123' } }),
      });
      await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
      const keystore = await fs.readFile('./android/keystores/keystore.jks', 'base64');
      const credJson = await fs.readJson('./credentials.json');
      expect(keystore).toEqual(testKeystore.keystore);
      expect(credJson).toEqual({
        android: {
          keystore: {
            keystorePath: 'android/keystores/keystore.jks',
            keystorePassword: testKeystore.keystorePassword,
            keyAlias: testKeystore.keyAlias,
            keyPassword: testKeystore.keyPassword,
          },
        },
      });
    });
    it('should update keystore and credentials.json if ios part of credentials.json is not valid', async () => {
      const ctx = getCtxMock();
      const credJson = {
        android: {
          keystore: {
            keystorePath: 'keystore.jks',
            keystorePassword: 'keystorePassword',
            keyAlias: 'keyAlias',
            keyPassword: 'keyPassword',
          },
        },
        ios: {
          test: '123',
        },
      };
      vol.fromJSON({
        './credentials.json': JSON.stringify(credJson),
        'keystore.jks': 'somebinarydata',
      });
      await credentialsJsonUpdateUtils.updateAndroidCredentialsAsync(ctx);
      const keystore = await fs.readFile('./keystore.jks', 'base64');
      const newCredJson = await fs.readJson('./credentials.json');
      expect(keystore).toEqual(testKeystore.keystore);
      expect(newCredJson).toEqual({
        android: {
          keystore: {
            keystorePath: 'keystore.jks',
            keystorePassword: testKeystore.keystorePassword,
            keyAlias: testKeystore.keyAlias,
            keyPassword: testKeystore.keyPassword,
          },
        },
        ios: {
          test: '123',
        },
      });
    });
  });
  describe('updateIosCredentialsAsync', () => {
    it('should update ios credentials in credentials.json if www returns valid credentials', async () => {
      const ctx = getCtxMock();
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
      await credentialsJsonUpdateUtils.updateIosCredentialsAsync(ctx, 'bundleIdentifier');
      const certP12 = await fs.readFile('./cert.p12', 'base64');
      const pprofile = await fs.readFile('./pprofile', 'base64');
      const credJson = await fs.readJson('./credentials.json');
      expect(certP12).toEqual(testAllCredentialsForApp.distCredentials.certP12);
      expect(pprofile).toEqual(testAllCredentialsForApp.credentials.provisioningProfile);
      expect(credJson).toEqual({
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            path: 'cert.p12',
            password: testAllCredentialsForApp.distCredentials.certPassword,
          },
        },
      });
    });
    it('should create credentials.json provisioning profile and distribution certificate if credentials.json does not exist', async () => {
      const ctx = getCtxMock();
      await credentialsJsonUpdateUtils.updateIosCredentialsAsync(ctx, 'bundleIdentifier');
      const certP12 = await fs.readFile('./ios/certs/dist-cert.p12', 'base64');
      const pprofile = await fs.readFile('./ios/certs/profile.mobileprovision', 'base64');
      const credJson = await fs.readJson('./credentials.json');
      expect(certP12).toEqual(testAllCredentialsForApp.distCredentials.certP12);
      expect(pprofile).toEqual(testAllCredentialsForApp.credentials.provisioningProfile);
      expect(credJson).toEqual({
        ios: {
          provisioningProfilePath: 'ios/certs/profile.mobileprovision',
          distributionCertificate: {
            path: 'ios/certs/dist-cert.p12',
            password: testAllCredentialsForApp.distCredentials.certPassword,
          },
        },
      });
    });
    it('should not do anything if no credentials are returned from www', async () => {
      const ctx = getCtxMock({
        ios: {
          getAppCredentials: () => ({
            experienceName: testExperienceName,
            bundleIdentifier: 'testbundle',
            credentials: {
              teamId: 'someid',
            },
          }),
          getDistCert: () => null,
        },
      });
      const credJson = {
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            path: 'cert.p12',
            password: 'certPass',
          },
        },
      };
      vol.fromJSON({
        './credentials.json': JSON.stringify(credJson),
        './pprofile': 'somebinarycontent',
        './cert.p12': 'somebinarycontent2',
      });
      await credentialsJsonUpdateUtils.updateIosCredentialsAsync(ctx, 'bundleIdentifier');
      const certP12 = await fs.readFile('./cert.p12', 'base64');
      const pprofile = await fs.readFile('./pprofile', 'base64');
      const newCredJson = await fs.readJson('./credentials.json');
      expect(certP12).toEqual('c29tZWJpbmFyeWNvbnRlbnQy'); // base64 "somebinarycontent2"
      expect(pprofile).toEqual('c29tZWJpbmFyeWNvbnRlbnQ='); // base64 "somebinarycontent"
      expect(newCredJson).toEqual(credJson);
    });
    it('should display confirm prompt if some credentials are missing in www (confirm: true)', async () => {
      const ctx = getCtxMock({
        ios: {
          getDistCert: () => null,
        },
      });

      (prompts as any)
        .mockImplementationOnce(() => ({ value: true })) // Continue with partial credentials
        .mockImplementation(() => {
          throw new Error("shouldn't happen");
        });

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
      await credentialsJsonUpdateUtils.updateIosCredentialsAsync(ctx, 'bundleIdentifier');
      expect(prompts).toBeCalledTimes(1);
      const certP12Exists = await fs.pathExists('./cert.p12');
      const pprofile = await fs.readFile('./pprofile', 'base64');
      const credJson = await fs.readJson('./credentials.json');
      expect(certP12Exists).toEqual(false);
      expect(pprofile).toEqual(testAllCredentialsForApp.credentials.provisioningProfile);
      expect(credJson).toEqual({
        ios: {
          provisioningProfilePath: 'pprofile',
        },
      });
    });
  });
});
