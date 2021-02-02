import AndroidApi from '../api/AndroidApi';
import {
  getApiV2WrapperMock,
  testAllCredentials,
  testAppCredentials,
  testJester2AppCredentials,
  testKeystore,
  testKeystore2,
  testPushCredentials,
} from './fixtures/mocks-android';
import { testExperienceName, testJester2ExperienceName } from './fixtures/mocks-constants';

beforeEach(() => {});

describe('AndroidApi - Basic Tests', () => {
  let androidApi;
  let apiMock;

  beforeEach(() => {
    apiMock = getApiV2WrapperMock();
    androidApi = new AndroidApi(jest.fn() as any);
    (androidApi as any).client = apiMock;
  });
  it('fetchAll', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    const credsFromServer = await androidApi.fetchAll();
    const credsFromMemory = await androidApi.fetchAll();

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
  });
  it('fetchKeystore', async () => {
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredentials);
    const creds = await androidApi.fetchKeystore(testExperienceName);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(creds).toMatchObject(testKeystore);
    expect(apiMock.getAllCredentialsForAppApi).toBeCalledWith(testExperienceName);
  });
  it('fetchKeystore when cached', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    await androidApi.fetchAll();
    const keystore = await androidApi.fetchKeystore(testExperienceName);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(1);
    expect(keystore).toMatchObject(testKeystore);
  });
  it('fetchKeystore when cached for different team', async () => {
    apiMock.getAllCredentialsApi.mockImplementation(() => testAllCredentials);
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testJester2AppCredentials);
    await androidApi.fetchAll();
    const keystore = await androidApi.fetchKeystore(testJester2ExperienceName);

    // expect to fetch from memory after 1st call
    expect(apiMock.getAllCredentialsApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(keystore).toMatchObject(testKeystore2);
  });
  it('updateKeystore when cached', async () => {
    apiMock.updateKeystoreApi.mockImplementation(jest.fn());
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredentials);
    await androidApi.fetchKeystore(testExperienceName);
    await androidApi.updateKeystore(testExperienceName, testKeystore2);
    const credsFromMemory = (androidApi as any).credentials;

    expect(apiMock.updateKeystoreApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory[testExperienceName].keystore).toMatchObject(testKeystore2);
    expect(credsFromMemory[testExperienceName].pushCredentials).toMatchObject(testPushCredentials);
    expect(apiMock.updateKeystoreApi).toBeCalledWith(testExperienceName, testKeystore2);
  });
  it('updateKeystore when not cached', async () => {
    apiMock.updateKeystoreApi.mockImplementation(jest.fn());
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredentials);
    await androidApi.updateKeystore(testExperienceName, testKeystore2);
    const credsFromMemory = (androidApi as any).credentials;

    expect(apiMock.updateKeystoreApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory[testExperienceName].keystore).toMatchObject(testKeystore2);
    expect(credsFromMemory[testExperienceName].pushCredentials).toMatchObject(testPushCredentials);
    expect(apiMock.updateKeystoreApi).toBeCalledWith(testExperienceName, testKeystore2);
  });
  it('removeKeystore when not cached', async () => {
    apiMock.removeKeystoreApi.mockImplementation(jest.fn());
    apiMock.getAllCredentialsForAppApi.mockImplementation(() => testAppCredentials);
    await androidApi.removeKeystore(testExperienceName, testKeystore2);
    const credsFromMemory = (androidApi as any).credentials;

    expect(apiMock.removeKeystoreApi.mock.calls.length).toBe(1);
    expect(apiMock.getAllCredentialsForAppApi.mock.calls.length).toBe(1);
    expect(credsFromMemory[testExperienceName].keystore).toBe(null);
    expect(credsFromMemory[testExperienceName].pushCredentials).toMatchObject(testPushCredentials);
    expect(apiMock.removeKeystoreApi).toBeCalledWith(testExperienceName);
  });
});
