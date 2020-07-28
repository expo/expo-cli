import {
  getCtxMock,
  testAppLookupParams,
  testDistCertsFromApple,
  testIosDistCredential,
} from '../../test-fixtures/mocks-ios';
import { SetupIosDist } from '../SetupIosDist';

// these variables need to be prefixed with 'mock' if declared outside of the mock scope
const mockDistCertManagerCreate = jest.fn(() => testIosDistCredential);
const mockDistCertManagerList = jest.fn(() => testDistCertsFromApple);
jest.mock('../../../appleApi', () => {
  return {
    DistCertManager: jest.fn().mockImplementation(() => ({
      create: mockDistCertManagerCreate,
      list: mockDistCertManagerList,
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
  mockDistCertManagerCreate.mockClear();
  mockDistCertManagerList.mockClear();
});

describe('SetupIosDist', () => {
  it('Basic Case - Create or Reuse', async () => {
    const ctx = getCtxMock({
      ios: {
        getDistCert: jest.fn(),
      },
      nonInteractive: true,
    });
    const setupIosDist = new SetupIosDist(testAppLookupParams);
    const createOrReuse = await setupIosDist.open(ctx as any);
    await createOrReuse.open(ctx as any);

    // expect suggested dist cert is used
    expect(ctx.ios.useDistCert.mock.calls.length).toBe(1);
  });
});
