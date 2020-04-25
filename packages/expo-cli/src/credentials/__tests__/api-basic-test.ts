import { IosApi } from '../api';
import {
  getApiV2MockCredentials,
  getCtxMock,
  jester,
  testAllCredentials,
  testAppCredential,
  testAppleTeam,
  testBundleIdentifier,
  testDistCert,
  testExperienceName,
  testLegacyPushCert,
  testProvisioningProfile,
  testPushKey,
} from '../test-fixtures/mocks';

const originalWarn = console.warn;
const originalLog = console.log;
beforeAll(() => {
  console.warn = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.warn = originalWarn;
  console.log = originalLog;
});
beforeEach(() => {});

describe('IosApi - Basic Tests', () => {
  let iosApi;
  let apiV2Mock;

  beforeEach(() => {
    apiV2Mock = getApiV2MockCredentials();
    iosApi = new IosApi(jester).withApiClient(apiV2Mock);
  });
  it('getAllCredentials', async () => {
    const credsFromServer = await iosApi.getAllCredentials();
    const credsFromMemory = await iosApi.getAllCredentials();

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/ios', { owner: jester.username });
  });
  it('getDistCert', async () => {
    const credsFromServer = await iosApi.getDistCert(testExperienceName, testBundleIdentifier);
    const credsFromMemory = await iosApi.getDistCert(testExperienceName, testBundleIdentifier);

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/ios', { owner: jester.username });
  });
  it('createDistCert', async () => {
    const postAsync = jest.fn(() => {
      return { id: 666 };
    });
    apiV2Mock = getApiV2MockCredentials({ postAsync });
    iosApi = iosApi.withApiClient(apiV2Mock);
    const newCred = await iosApi.createDistCert(testDistCert);

    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith('credentials/ios/dist', {
      credentials: testDistCert,
      owner: jester.username,
    });
    expect(newCred).toMatchObject({
      ...testDistCert,
      id: 666,
    });
  });
  it('updateDistCert', async () => {
    const credentialsId = 666;
    const putAsync = jest.fn(() => {
      return { id: credentialsId };
    });
    apiV2Mock = getApiV2MockCredentials({ putAsync });
    iosApi = iosApi.withApiClient(apiV2Mock);
    const newCred = await iosApi.updateDistCert(credentialsId, testDistCert);

    expect(apiV2Mock.putAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.putAsync).toBeCalledWith(`credentials/ios/dist/${credentialsId}`, {
      credentials: testDistCert,
      owner: jester.username,
    });
    expect(newCred).toMatchObject({
      ...testDistCert,
      id: credentialsId,
    });
  });
  it('deleteDistCert', async () => {
    const credentialsId = 666;
    await iosApi.deleteDistCert(credentialsId);

    expect(apiV2Mock.deleteAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.deleteAsync).toBeCalledWith(`credentials/ios/dist/${credentialsId}`, {
      owner: jester.username,
    });
  });
  it('useDistCert', async () => {
    const credentialsId = 666;
    await iosApi.useDistCert(testExperienceName, testBundleIdentifier, credentialsId);

    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith('credentials/ios/use/dist', {
      experienceName: testExperienceName,
      bundleIdentifier: testBundleIdentifier,
      userCredentialsId: credentialsId,
      owner: jester.username,
    });
  });
  it('createPushKey', async () => {
    const postAsync = jest.fn(() => {
      return { id: 666 };
    });
    apiV2Mock = getApiV2MockCredentials({ postAsync });
    iosApi = iosApi.withApiClient(apiV2Mock);
    const newCred = await iosApi.createPushKey(testPushKey);

    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith('credentials/ios/push', {
      credentials: testPushKey,
      owner: jester.username,
    });
    expect(newCred).toMatchObject({
      ...testPushKey,
      id: 666,
    });
  });
  it('updatePushKey', async () => {
    const credentialsId = 666;
    const putAsync = jest.fn(() => {
      return { id: credentialsId };
    });
    apiV2Mock = getApiV2MockCredentials({ putAsync });
    iosApi = iosApi.withApiClient(apiV2Mock);
    const newCred = await iosApi.updatePushKey(credentialsId, testPushKey);

    expect(apiV2Mock.putAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.putAsync).toBeCalledWith(`credentials/ios/push/${credentialsId}`, {
      credentials: testPushKey,
      owner: jester.username,
    });
    expect(newCred).toMatchObject({
      ...testPushKey,
      id: credentialsId,
    });
  });
  it('deletePushKey', async () => {
    const credentialsId = 666;
    await iosApi.deletePushKey(credentialsId);

    expect(apiV2Mock.deleteAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.deleteAsync).toBeCalledWith(`credentials/ios/push/${credentialsId}`, {
      owner: jester.username,
    });
  });
  it('getPushKey', async () => {
    const credsFromServer = await iosApi.getPushKey(testExperienceName, testBundleIdentifier);
    const credsFromMemory = await iosApi.getPushKey(testExperienceName, testBundleIdentifier);

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/ios', { owner: jester.username });
  });
  it('usePushKey', async () => {
    const credentialsId = 666;
    await iosApi.usePushKey(testExperienceName, testBundleIdentifier, credentialsId);

    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith('credentials/ios/use/push', {
      experienceName: testExperienceName,
      bundleIdentifier: testBundleIdentifier,
      userCredentialsId: credentialsId,
      owner: jester.username,
    });
  });
  it('getPushCert', async () => {
    const testAppCredentialsWithLegacyCert = {
      ...testAppCredential,
      credentials: testLegacyPushCert,
    };
    const testAllCredentialsWithLegacyCert = {
      ...testAllCredentials,
    };
    testAllCredentialsWithLegacyCert.appCredentials = [testAppCredentialsWithLegacyCert];
    const getAsync = jest.fn(() => testAllCredentialsWithLegacyCert);
    apiV2Mock = getApiV2MockCredentials({ getAsync });
    iosApi = iosApi.withApiClient(apiV2Mock);

    const credsFromServer = await iosApi.getPushCert(testExperienceName, testBundleIdentifier);
    const credsFromMemory = await iosApi.getPushCert(testExperienceName, testBundleIdentifier);

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/ios', { owner: jester.username });
  });
  it('deletePushCert', async () => {
    // this call wont work unless we fetch credentials first
    await iosApi.getAllCredentials();
    await iosApi.deletePushCert(testExperienceName, testBundleIdentifier);

    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith(`credentials/ios/pushCert/delete`, {
      experienceName: testExperienceName,
      bundleIdentifier: testBundleIdentifier,
      owner: jester.username,
    });
  });
  it('updateProvisioningProfile', async () => {
    // this call wont work unless we fetch credentials first
    await iosApi.getAllCredentials();

    await iosApi.updateProvisioningProfile(
      testExperienceName,
      testBundleIdentifier,
      testProvisioningProfile,
      testAppleTeam
    );

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith(`credentials/ios/provisioningProfile/update`, {
      experienceName: testExperienceName,
      bundleIdentifier: testBundleIdentifier,
      credentials: { ...testProvisioningProfile, teamId: testAppleTeam.id },
      owner: jester.username,
    });
  });
  it('getAppCredentials', async () => {
    const credsFromServer = await iosApi.getAppCredentials(
      testExperienceName,
      testBundleIdentifier
    );
    const credsFromMemory = await await iosApi.getAppCredentials(
      testExperienceName,
      testBundleIdentifier
    );

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/ios', { owner: jester.username });
  });
  it('getProvisioningProfile', async () => {
    const credsFromServer = await iosApi.getProvisioningProfile(
      testExperienceName,
      testBundleIdentifier
    );
    const credsFromMemory = await iosApi.getProvisioningProfile(
      testExperienceName,
      testBundleIdentifier
    );

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/ios', { owner: jester.username });
  });
  it('deleteProvisioningProfile', async () => {
    // this call wont work unless we fetch credentials first
    await iosApi.getAllCredentials();
    await iosApi.deleteProvisioningProfile(testExperienceName, testBundleIdentifier);

    expect(apiV2Mock.postAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.postAsync).toBeCalledWith(`credentials/ios/provisioningProfile/delete`, {
      experienceName: testExperienceName,
      bundleIdentifier: testBundleIdentifier,
      owner: jester.username,
    });
  });
});
