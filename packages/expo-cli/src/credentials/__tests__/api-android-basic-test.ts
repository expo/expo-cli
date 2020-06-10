import { AndroidApi } from '../api/android';
import {
  getApiV2MockCredentials,
  getCtxMock,
  jester,
  testAllCredentials,
  testExperienceName,
  testJester2ExperienceName,
  testKeystore,
  testKeystore2,
  testPushCredentials,
} from '../test-fixtures/mocks-android';

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

describe('AndroidApi - Basic Tests', () => {
  let androidApi;
  let apiV2Mock;

  beforeEach(() => {
    apiV2Mock = getApiV2MockCredentials();
    androidApi = new AndroidApi(jester).withApiClient(apiV2Mock);
  });
  it('fetchAll', async () => {
    const credsFromServer = await androidApi.fetchAll();
    const credsFromMemory = await androidApi.fetchAll();

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory).toMatchObject(credsFromServer);
    expect(apiV2Mock.getAsync).toBeCalledWith('credentials/android');
  });
  it('fetchKeystore', async () => {
    const creds = await androidApi.fetchKeystore(testExperienceName);

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(creds).toMatchObject(testKeystore);
    expect(apiV2Mock.getAsync).toBeCalledWith(`credentials/android/${testExperienceName}`);
  });
  it('fetchKeystore when cached', async () => {
    await androidApi.fetchAll();
    const keystore = await androidApi.fetchKeystore(testExperienceName);
    const credsFromMemory = (androidApi as any).credentials;

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(keystore).toMatchObject(testKeystore);
    expect(apiV2Mock.getAsync).toBeCalledWith(`credentials/android`);
  });
  it('fetchKeystore when cached for different team', async () => {
    await androidApi.fetchAll();
    const keystore = await androidApi.fetchKeystore(testJester2ExperienceName);
    const credsFromMemory = (androidApi as any).credentials;

    // expect to fetch from memory after 1st call
    expect(apiV2Mock.getAsync.mock.calls.length).toBe(2);
    expect(keystore).toMatchObject(testKeystore2);
    expect(apiV2Mock.getAsync).toBeCalledWith(`credentials/android/${testJester2ExperienceName}`);
  });
  it('updateKeystore when cached', async () => {
    const credsFromServer = await androidApi.fetchAll();
    await androidApi.updateKeystore(testExperienceName, testKeystore2);
    const credsFromMemory = (androidApi as any).credentials;

    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.putAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory[testExperienceName].keystore).toMatchObject(testKeystore2);
    expect(credsFromMemory[testExperienceName].pushCredentials).toMatchObject(testPushCredentials);
    expect(apiV2Mock.putAsync).toBeCalledWith(
      `credentials/android/keystore/${testExperienceName}`,
      {
        keystore: testKeystore2,
      }
    );
  });
  it('updateKeystore when not cached', async () => {
    await androidApi.updateKeystore(testExperienceName, testKeystore2);
    const credsFromMemory = (androidApi as any).credentials;

    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.putAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory[testExperienceName].keystore).toMatchObject(testKeystore2);
    expect(credsFromMemory[testExperienceName].pushCredentials).toMatchObject(testPushCredentials);
    expect(apiV2Mock.putAsync).toBeCalledWith(
      `credentials/android/keystore/${testExperienceName}`,
      {
        keystore: testKeystore2,
      }
    );
  });
  it('removeKeystore when not cached', async () => {
    await androidApi.removeKeystore(testExperienceName, testKeystore2);
    const credsFromMemory = (androidApi as any).credentials;

    expect(apiV2Mock.getAsync.mock.calls.length).toBe(1);
    expect(apiV2Mock.deleteAsync.mock.calls.length).toBe(1);
    expect(credsFromMemory[testExperienceName].keystore).toBe(null);
    expect(credsFromMemory[testExperienceName].pushCredentials).toMatchObject(testPushCredentials);
    expect(apiV2Mock.deleteAsync).toBeCalledWith(
      `credentials/android/keystore/${testExperienceName}`
    );
  });
});
