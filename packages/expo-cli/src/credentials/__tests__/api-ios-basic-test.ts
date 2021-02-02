import IosApi from '../api/IosApi';
import { jester, jester2, testAppLookupParams } from './fixtures/mocks-constants';
import {
  getApiV2WrapperMock,
  testAllCredentials,
  testAllCredentialsForApp,
  testAppCredential,
  testDistCert,
  testIosDistCredential,
  testIosPushCredential,
  testLegacyPushCert,
  testProvisioningProfile,
  testPushKey,
} from './fixtures/mocks-ios';

describe('IosApi - Basic Tests', () => {
  let iosApi;
  let apiMock;

  beforeEach(() => {
    apiMock = getApiV2WrapperMock();
    iosApi = new IosApi(jest.fn() as any);
    (iosApi as any).client = apiMock;
  });
  it('getAllCredentials', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    const credsFromServer = await iosApi.getAllCredentials(jester.username);
    const credsFromMemory = await iosApi.getAllCredentials(jester.username);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsApi).toBeCalledWith(jester.username);
  });
  it('getAllCredentials for different owners', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    const credsFromServer = await iosApi.getAllCredentials(jester.username);
    await iosApi.getAllCredentials(jester2.username);
    const credsFromMemory = await iosApi.getAllCredentials(jester.username);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(2);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsApi).toBeCalledWith(jester.username);
    expect(apiMock.getAllCredentialsApi).toBeCalledWith(jester2.username);
  });
  it('getDistCert', async () => {
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    const credsFromServer = await iosApi.getDistCert(testAppLookupParams);
    const credsFromMemory = await iosApi.getDistCert(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });
  it('getDistCert when prefetched', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    const credsFromServer = await iosApi.getAllCredentials(jester.username);
    const credsFromMemory = await iosApi.getDistCert(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(0);
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(
      credsFromServer.userCredentials.find(c => c.id === credsFromMemory.id)
    );
    expect(apiMock.getAllCredentialsApi).toBeCalledWith(jester.username);
  });
  it('createDistCert', async () => {
    apiMock.createDistCertApi.mockImplementationOnce(() => {
      apiMock.getUserCredentialsByIdApi.mockImplementation(() => ({
        ...testIosDistCredential,
        id: 666,
      }));
      return 666;
    });
    const newCred = await iosApi.createDistCert(jester.username, testDistCert);

    expect(apiMock.createDistCertApi.mock.calls.length).toBe(1);
    expect(apiMock.getUserCredentialsByIdApi.mock.calls.length).toBe(1);
    expect(apiMock.createDistCertApi).toBeCalledWith(jester.username, testDistCert);
    expect(apiMock.getUserCredentialsByIdApi).toBeCalledWith(666, jester.username);
    expect(newCred).toMatchObject({ ...testDistCert, id: 666 });
  });
  it('updateDistCert', async () => {
    const distCert = {
      certP12: 'different file test-p12',
      certPassword: 'different password test-password',
      distCertSerialNumber: 'different test-serial',
      teamId: 'test-team-id',
    };
    apiMock.updateDistCertApi.mockImplementationOnce(() => {
      apiMock.getUserCredentialsByIdApi.mockImplementation(() => ({
        ...distCert,
        id: 1,
        type: 'dist-cert',
      }));
    });

    const updatedCred = await iosApi.updateDistCert(1, jester.username, distCert);

    expect(apiMock.updateDistCertApi.mock.calls.length).toBe(1);
    expect(apiMock.getUserCredentialsByIdApi.mock.calls.length).toBe(1);
    expect(apiMock.updateDistCertApi).toBeCalledWith(1, jester.username, distCert);
    expect(apiMock.getUserCredentialsByIdApi).toBeCalledWith(1, jester.username);
    expect(updatedCred).toMatchObject({ ...distCert, id: 1, type: 'dist-cert' });
  });
  it('deleteDistCert', async () => {
    apiMock.deleteDistCertApi.mockImplementationOnce(jest.fn());
    await iosApi.deleteDistCert(1, jester.username);

    expect(apiMock.deleteDistCertApi.mock.calls.length).toBe(1);
    expect(apiMock.deleteDistCertApi).toBeCalledWith(1, jester.username);
  });
  it('useDistCert', async () => {
    const credentialsId = 666;
    apiMock.useDistCertApi.mockImplementationOnce(() => {
      apiMock.getAllCredentialsForAppApi.mockImplementation(() => ({
        ...testAllCredentialsForApp,
        distCredentialsId: credentialsId,
      }));
    });
    await iosApi.useDistCert(testAppLookupParams, credentialsId);

    expect(apiMock.useDistCertApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(apiMock.useDistCertApi).toBeCalledWith(testAppLookupParams, 666);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });

  it('getPushKey', async () => {
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    const credsFromServer = await iosApi.getPushKey(testAppLookupParams);
    const credsFromMemory = await iosApi.getPushKey(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });
  it('getPushKey when prefetched', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    const credsFromServer = await iosApi.getAllCredentials(jester.username);
    const credsFromMemory = await iosApi.getPushKey(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(0);
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(
      credsFromServer.userCredentials.find(c => c.id === credsFromMemory.id)
    );
    expect(apiMock.getAllCredentialsApi).toBeCalledWith(jester.username);
  });
  it('createPushKey', async () => {
    apiMock.createPushKeyApi.mockImplementationOnce(() => {
      apiMock.getUserCredentialsByIdApi.mockImplementation(() => ({
        ...testIosPushCredential,
        id: 666,
      }));
      return 666;
    });
    const newCred = await iosApi.createPushKey(jester.username, testPushKey);

    expect(apiMock.createPushKeyApi.mock.calls.length).toBe(1);
    expect(apiMock.getUserCredentialsByIdApi.mock.calls.length).toBe(1);
    expect(apiMock.createPushKeyApi).toBeCalledWith(jester.username, testPushKey);
    expect(apiMock.getUserCredentialsByIdApi).toBeCalledWith(666, jester.username);
    expect(newCred).toMatchObject({ ...testPushKey, id: 666 });
  });
  it('updatePushKey', async () => {
    const pushKey = {
      apnsKeyP8: 'different file',
      apnsKeyId: 'different id',
      teamId: 'test-team-id',
    };
    apiMock.updatePushKeyApi.mockImplementationOnce(() => {
      apiMock.getUserCredentialsByIdApi.mockImplementation(() => ({
        ...pushKey,
        id: 2,
        type: 'push-key',
      }));
    });

    const updatedCred = await iosApi.updatePushKey(2, jester.username, pushKey);

    expect(apiMock.updatePushKeyApi.mock.calls.length).toBe(1);
    expect(apiMock.getUserCredentialsByIdApi.mock.calls.length).toBe(1);
    expect(apiMock.updatePushKeyApi).toBeCalledWith(2, jester.username, pushKey);
    expect(apiMock.getUserCredentialsByIdApi).toBeCalledWith(2, jester.username);
    expect(updatedCred).toMatchObject({ ...pushKey, id: 2, type: 'push-key' });
  });
  it('deletePushKey', async () => {
    apiMock.deletePushKeyApi.mockImplementationOnce(jest.fn());
    await iosApi.deletePushKey(2, jester.username);

    expect(apiMock.deletePushKeyApi.mock.calls.length).toBe(1);
    expect(apiMock.deletePushKeyApi).toBeCalledWith(2, jester.username);
  });
  it('usePushKey', async () => {
    const credentialsId = 666;
    apiMock.usePushKeyApi.mockImplementationOnce(() => {
      apiMock.getAllCredentialsForAppApi.mockImplementation(() => ({
        ...testAllCredentialsForApp,
        pushCredentialsId: credentialsId,
      }));
    });
    await iosApi.usePushKey(testAppLookupParams, credentialsId);

    expect(apiMock.usePushKeyApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(apiMock.usePushKeyApi).toBeCalledWith(testAppLookupParams, 666);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });

  it('getPushCert', async () => {
    const testAppCredentialsWithLegacyCert = {
      ...testAppCredential,
      credentials: testLegacyPushCert,
    };
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredentialsWithLegacyCert);

    const credsFromServer = await iosApi.getPushCert(testAppLookupParams);
    const credsFromMemory = await iosApi.getPushCert(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });
  it('deletePushCert when prefetched', async () => {
    const testAppCredentialsWithLegacyCert = {
      ...testAppCredential,
      credentials: testLegacyPushCert,
    };
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredentialsWithLegacyCert);
    apiMock.deletePushCertApi.mockImplementationOnce(jest.fn());

    await iosApi.getAppCredentials(testAppLookupParams);
    await iosApi.deletePushCert(testAppLookupParams);

    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(2);
    expect(apiMock.deletePushCertApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
    expect(apiMock.deletePushCertApi).toBeCalledWith(testAppLookupParams);
  });

  it('deletePushCert whithout prefetching prefetching', async () => {
    apiMock.deletePushCertApi.mockImplementationOnce(() => {
      apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredential);
    });

    await iosApi.deletePushCert(testAppLookupParams);

    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(apiMock.deletePushCertApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
    expect(apiMock.deletePushCertApi).toBeCalledWith(testAppLookupParams);

    // should be cached after that
    await iosApi.getAppCredentials(testAppLookupParams);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
  });
  it('updateProvisioningProfile', async () => {
    apiMock.updateProvisioningProfileApi.mockImplementationOnce(() => {
      apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    });
    await iosApi.updateProvisioningProfile(testAppLookupParams, testProvisioningProfile);

    // expect to fetch from memory after 1st call
    expect(apiMock.updateProvisioningProfileApi.mock.calls.length).toBe(1);
    expect(apiMock.updateProvisioningProfileApi).toBeCalledWith(
      testAppLookupParams,
      testProvisioningProfile
    );
  });
  it('getAppCredentials', async () => {
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    const credsFromServer = await iosApi.getAppCredentials(testAppLookupParams);
    const credsFromMemory = await await iosApi.getAppCredentials(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });
  it('getProvisioningProfile', async () => {
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    const credsFromServer = await iosApi.getProvisioningProfile(testAppLookupParams);
    const credsFromMemory = await iosApi.getProvisioningProfile(testAppLookupParams);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testAppLookupParams);
  });
  it('deleteProvisioningProfile', async () => {
    apiMock.deleteProvisioningProfileApi.mockImplementationOnce(() => {
      apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAllCredentialsForApp);
    });
    await iosApi.deleteProvisioningProfile(testAppLookupParams);

    expect(apiMock.deleteProvisioningProfileApi.mock.calls.length).toBe(1);
    expect(apiMock.deleteProvisioningProfileApi).toBeCalledWith(testAppLookupParams);
  });
});
