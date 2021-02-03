import { jester, testAppLookupParams } from '../../__tests__/fixtures/mocks-constants';
import { getCtxMock } from '../../__tests__/fixtures/mocks-context';
import { testIosPushCredential, testPushKeysFromApple } from '../../__tests__/fixtures/mocks-ios';
import { CreateIosPush, CreateOrReusePushKey } from '../IosPushCredentials';

// these variables need to be prefixed with 'mock' if declared outside of the mock scope
const mockPushKeyManagerCreate = jest.fn(() => testIosPushCredential);
const mockPushKeyManagerList = jest.fn(() => testPushKeysFromApple);
jest.mock('../../../appleApi', () => {
  return {
    PushKeyManager: jest.fn().mockImplementation(() => ({
      create: mockPushKeyManagerCreate,
      list: mockPushKeyManagerList,
    })),
  };
});

jest.mock('../../actions/list');

beforeEach(() => {
  mockPushKeyManagerCreate.mockClear();
  mockPushKeyManagerList.mockClear();
});

describe('IosPushCredentials', () => {
  describe('CreateIosPush', () => {
    it('Basic Case - Create a Push Key and save it to Expo Servers', async () => {
      const ctx = getCtxMock({ nonInteractive: true });
      const createIosPush = new CreateIosPush(jester.username);
      await createIosPush.open(ctx as any);

      // expect push key is created
      expect(mockPushKeyManagerCreate.mock.calls.length).toBe(1);

      // expect push key is saved to servers
      expect(ctx.ios.createPushKey.mock.calls.length).toBe(1);
    });
  });
  describe('CreateOrReusePushKey', () => {
    it('Reuse Autosuggested Push Key ', async () => {
      const ctx = getCtxMock({ nonInteractive: true });
      const createOrReusePushKey = new CreateOrReusePushKey(testAppLookupParams);
      await createOrReusePushKey.open(ctx as any);

      // expect suggested push key is used
      expect(ctx.ios.usePushKey.mock.calls.length).toBe(1);

      // expect reuse: fail if push key is created
      expect(mockPushKeyManagerCreate.mock.calls.length).toBe(0);

      // expect reuse: fail if push key is saved to servers
      expect(ctx.ios.createPushKey.mock.calls.length).toBe(0);
    });
    it('No Autosuggested Push Key available, create new push key', async () => {
      // no available keys on apple dev portal
      mockPushKeyManagerList.mockImplementation(() => [] as any);

      const ctx = getCtxMock({ nonInteractive: true });
      const createOrReusePushKey = new CreateOrReusePushKey(testAppLookupParams);
      await createOrReusePushKey.open(ctx as any);

      // expect suggested push key is used
      expect(ctx.ios.usePushKey.mock.calls.length).toBe(1);

      // expect push key is created
      expect(mockPushKeyManagerCreate.mock.calls.length).toBe(1);

      // expect push key is saved to servers
      expect(ctx.ios.createPushKey.mock.calls.length).toBe(1);
    });
  });
});
