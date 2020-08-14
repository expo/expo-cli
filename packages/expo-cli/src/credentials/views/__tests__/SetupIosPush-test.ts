import {
  getCtxMock,
  testAppLookupParams,
  testIosPushCredential,
  testPushKeysFromApple,
} from '../../test-fixtures/mocks-ios';
import { SetupIosPush } from '../SetupIosPush';

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
beforeEach(() => {
  mockPushKeyManagerCreate.mockClear();
  mockPushKeyManagerList.mockClear();
});

describe('SetupIosPush', () => {
  it('Basic Case - Create or Reuse', async () => {
    const ctx = getCtxMock({
      ios: {
        getPushKey: jest.fn(),
      },
      nonInteractive: true,
    });
    const setupIosPush = new SetupIosPush(testAppLookupParams);
    const createOrReuse = await setupIosPush.open(ctx as any);
    await createOrReuse.open(ctx as any);

    // expect suggested push key is used
    expect(ctx.ios.usePushKey.mock.calls.length).toBe(1);
  });
});
