import commandExists from 'command-exists';
import fs from 'fs-extra';
import { vol } from 'memfs';

import { testKeystore } from '../../test-fixtures/mocks-android';
import { testAppLookupParams } from '../../test-fixtures/mocks-constants';
import { getCtxMock } from '../../test-fixtures/mocks-context';
import { testAllCredentialsForApp } from '../../test-fixtures/mocks-ios';
import { SetupIosBuildCredentialsFromLocal } from '../SetupIosBuildCredentials';

jest.mock('../../actions/list');
jest.mock('command-exists');
jest.mock('fs');

(commandExists as any).mockImplementation(() => {
  return true;
});

const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

beforeEach(() => {
  vol.reset();
});

describe('SetupIosBuildCredentialsFromLocal', () => {
  it('should check credentials and exit for valid credentials.json', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            path: 'cert.p12',
            password: testAllCredentialsForApp.distCredentials.certPassword,
          },
        },
      }),
    });
    await fs.writeFile(
      './pprofile',
      Buffer.from(testAllCredentialsForApp.credentials.provisioningProfile, 'base64')
    );
    await fs.writeFile(
      './cert.p12',
      Buffer.from(testAllCredentialsForApp.distCredentials.certP12, 'base64')
    );

    const ctx = getCtxMock();
    const view = new SetupIosBuildCredentialsFromLocal(testAppLookupParams);
    const lastView = await view.open(ctx);

    expect(lastView).toBe(null);
    expect(ctx.ios.updateProvisioningProfile.mock.calls.length).toBe(1);
    expect(ctx.ios.updateProvisioningProfile).toBeCalledWith(testAppLookupParams, {
      provisioningProfile: testAllCredentialsForApp.credentials.provisioningProfile,
      teamId: 'QL76XYH73P',
      teamName: 'Alicja Warchał',
    });
  });
  it('should fail if there are missing fields', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            password: testAllCredentialsForApp.distCredentials.certPassword,
          },
        },
      }),
    });
    await fs.writeFile(
      './pprofile',
      Buffer.from(testAllCredentialsForApp.credentials.provisioningProfile, 'base64')
    );
    await fs.writeFile(
      './cert.p12',
      Buffer.from(testAllCredentialsForApp.distCredentials.certP12, 'base64')
    );

    const ctx = getCtxMock();
    const view = new SetupIosBuildCredentialsFromLocal(testAppLookupParams);

    await expect(view.open(ctx)).rejects.toThrowError();
  });
  it('should fail if there is file missing', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            path: 'cert.p12',
            password: testAllCredentialsForApp.distCredentials.certPassword,
          },
        },
      }),
    });
    await fs.writeFile(
      './cert.p12',
      Buffer.from(testAllCredentialsForApp.distCredentials.certP12, 'base64')
    );

    const ctx = getCtxMock();
    const view = new SetupIosBuildCredentialsFromLocal(testAppLookupParams);
    await expect(view.open(ctx)).rejects.toThrowError();
  });
  it('should fail if there is missing field in android config', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        android: {
          keystore: {
            test: '123',
          },
        },
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            path: 'cert.p12',
            password: testAllCredentialsForApp.distCredentials.certPassword,
          },
        },
      }),
    });
    await fs.writeFile(
      './pprofile',
      Buffer.from(testAllCredentialsForApp.credentials.provisioningProfile, 'base64')
    );
    await fs.writeFile(
      './cert.p12',
      Buffer.from(testAllCredentialsForApp.distCredentials.certP12, 'base64')
    );

    const ctx = getCtxMock();
    const view = new SetupIosBuildCredentialsFromLocal(testAppLookupParams);
    await expect(view.open(ctx)).rejects.toThrowError();
  });
  it('should work if there is missing file in android config', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        android: {
          keystore: {
            keystorePath: 'keystore.jks',
            keystorePassword: testKeystore.keystorePassword,
            keyAlias: testKeystore.keyAlias,
            keyPassword: testKeystore.keyPassword,
          },
        },
        ios: {
          provisioningProfilePath: 'pprofile',
          distributionCertificate: {
            path: 'cert.p12',
            password: 'certPass',
          },
        },
      }),
    });
    await fs.writeFile(
      './pprofile',
      Buffer.from(testAllCredentialsForApp.credentials.provisioningProfile, 'base64')
    );
    await fs.writeFile(
      './cert.p12',
      Buffer.from(testAllCredentialsForApp.distCredentials.certP12, 'base64')
    );

    const ctx = getCtxMock();
    const view = new SetupIosBuildCredentialsFromLocal(testAppLookupParams);
    const lastView = await view.open(ctx);

    expect(lastView).toBe(null);
    expect(ctx.ios.updateProvisioningProfile.mock.calls.length).toBe(1);
    expect(ctx.ios.updateProvisioningProfile).toBeCalledWith(testAppLookupParams, {
      provisioningProfile: testAllCredentialsForApp.credentials.provisioningProfile,
      teamId: 'QL76XYH73P',
      teamName: 'Alicja Warchał',
    });
  });
});
