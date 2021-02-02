import commandExists from 'command-exists';
import fs from 'fs-extra';
import { vol } from 'memfs';

import { testKeystore } from '../../__tests__/fixtures/mocks-android';
import { testAppLookupParams } from '../../__tests__/fixtures/mocks-constants';
import { getCtxMock } from '../../__tests__/fixtures/mocks-context';
import { testAllCredentialsForApp } from '../../__tests__/fixtures/mocks-ios';
import { SetupIosBuildCredentialsFromLocal } from '../SetupIosBuildCredentials';

jest.mock('../../actions/list');
jest.mock('command-exists');
jest.mock('fs');

(commandExists as any).mockImplementation(() => {
  return true;
});

beforeEach(() => {
  vol.reset();
});

describe('SetupIosBuildCredentialsFromLocal', () => {
  it('should update ios credentials on www if credentials.json is valid', async () => {
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
      teamId: 'QL76XYH73P', // read from provisioningProfile
      teamName: 'Alicja Warchał',
    });
  });
  it('should fail if there are missing fields in credentials.json', async () => {
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
  it('should fail if file specified in credentials.json does not exist', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        ios: {
          provisioningProfilePath: 'pprofile', // does not exist
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
  it('should fail if there are missing fields in android part of credential.json', async () => {
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
  it('should update credenatils on www if file specified in android part of credentials.json does not exist', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        android: {
          keystore: {
            keystorePath: 'keystore.jks', // does not exist
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
