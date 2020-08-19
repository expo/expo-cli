import commandExists from 'command-exists';
import fs from 'fs-extra';
import { vol } from 'memfs';

import { testKeystore } from '../../test-fixtures/mocks-android';
import { testExperienceName } from '../../test-fixtures/mocks-constants';
import { getCtxMock } from '../../test-fixtures/mocks-context';
import { SetupAndroidBuildCredentialsFromLocal } from '../SetupAndroidKeystore';

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

describe('SetupAndroidBuildCredentialsFromLocal', () => {
  it('should check credentials and exit for valid credentials.json', async () => {
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
      }),
    });
    await fs.writeFile('keystore.jks', Buffer.from(testKeystore.keystore, 'base64'));

    const ctx = getCtxMock();
    const view = new SetupAndroidBuildCredentialsFromLocal(testExperienceName);
    const lastView = await view.open(ctx);

    expect(lastView).toBe(null);
    expect(ctx.android.updateKeystore.mock.calls.length).toBe(1);
    expect(ctx.android.updateKeystore).toBeCalledWith(testExperienceName, testKeystore);
  });
  it('should fail if there are missing fields', async () => {
    vol.fromJSON({
      'credentials.json': JSON.stringify({
        android: {
          keystore: {
            keystorePath: 'keystore.jks',
            keyAlias: testKeystore.keyAlias,
            keyPassword: testKeystore.keyPassword,
          },
        },
      }),
    });
    await fs.writeFile('keystore.jks', Buffer.from(testKeystore.keystore, 'base64'));

    const ctx = getCtxMock();
    const view = new SetupAndroidBuildCredentialsFromLocal(testExperienceName);
    await expect(view.open(ctx)).rejects.toThrowError();
  });
  it('should fail if there is missing file', async () => {
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
      }),
    });

    const ctx = getCtxMock();
    const view = new SetupAndroidBuildCredentialsFromLocal(testExperienceName);
    await expect(view.open(ctx)).rejects.toThrowError();
  });
  it('should fail if there is missing field in ios config', async () => {
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
          test: '123',
        },
      }),
    });
    await fs.writeFile('keystore.jks', Buffer.from(testKeystore.keystore, 'base64'));

    const ctx = getCtxMock();
    const view = new SetupAndroidBuildCredentialsFromLocal(testExperienceName);
    await expect(view.open(ctx)).rejects.toThrowError();
  });
  it('should work if there is missing file in ios config', async () => {
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
    await fs.writeFile('keystore.jks', Buffer.from(testKeystore.keystore, 'base64'));

    const ctx = getCtxMock();
    const view = new SetupAndroidBuildCredentialsFromLocal(testExperienceName);
    const lastView = await view.open(ctx);

    expect(lastView).toBe(null);
    expect(ctx.android.updateKeystore.mock.calls.length).toBe(1);
    expect(ctx.android.updateKeystore).toBeCalledWith(testExperienceName, testKeystore);
  });
});
