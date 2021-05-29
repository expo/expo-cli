import { jester, testAppLookupParams } from '../../__tests__/fixtures/mocks-constants';
import { getCtxMock } from '../../__tests__/fixtures/mocks-context';
import { testDistCertsFromApple, testIosDistCredential } from '../../__tests__/fixtures/mocks-ios';
import { CreateIosDist, CreateOrReuseDistributionCert } from '../IosDistCert';

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

beforeEach(() => {
  mockDistCertManagerCreate.mockClear();
  mockDistCertManagerList.mockClear();
});

describe('IosDistCert', () => {
  describe('CreateIosDist', () => {
    it('Basic Case - Create a Dist Cert and save it to Expo Servers', async () => {
      const ctx = getCtxMock({ nonInteractive: true });
      const createIosDist = new CreateIosDist(jester.username);
      await createIosDist.open(ctx as any);

      // expect dist cert is created
      expect(mockDistCertManagerCreate.mock.calls.length).toBe(1);

      // expect dist cert is saved to servers
      expect(ctx.ios.createDistCert.mock.calls.length).toBe(1);
    });
  });
  describe('CreateOrReuseDistributionCert', () => {
    it('Reuse Autosuggested Dist Cert ', async () => {
      const ctx = getCtxMock({ nonInteractive: true });
      const createOrReuseIosDist = new CreateOrReuseDistributionCert(testAppLookupParams);
      await createOrReuseIosDist.open(ctx as any);

      // expect suggested dist cert is used
      expect(ctx.ios.useDistCert.mock.calls.length).toBe(1);

      // expect reuse: fail if dist cert is created
      expect(mockDistCertManagerCreate.mock.calls.length).toBe(0);

      // expect reuse: fail if dist cert is saved to servers
      expect(ctx.ios.createDistCert.mock.calls.length).toBe(0);
    });
    it('No Autosuggested Dist Cert available, create new dist cert', async () => {
      // no available certs on apple dev portal
      mockDistCertManagerList.mockImplementation(() => [] as any);

      const ctx = getCtxMock({ nonInteractive: true });

      const createOrReuseIosDist = new CreateOrReuseDistributionCert(testAppLookupParams);
      await createOrReuseIosDist.open(ctx as any);

      // expect dist cert is used
      expect(ctx.ios.useDistCert.mock.calls.length).toBe(1);

      // expect dist cert is created
      expect(mockDistCertManagerCreate.mock.calls.length).toBe(1);

      // expect dist cert is saved to servers
      expect(ctx.ios.createDistCert.mock.calls.length).toBe(1);
    });
  });
});
