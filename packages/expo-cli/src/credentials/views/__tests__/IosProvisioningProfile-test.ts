import {
  CreateOrReuseProvisioningProfile,
  CreateProvisioningProfile,
} from '../IosProvisioningProfile';
import {
  getCtxMock,
  testIosDistCredential,
  testProvisioningProfiles,
  testProvisioningProfilesFromApple,
} from '../../test-fixtures/mocks';

// these variables need to be prefixed with 'mock' if declared outside of the mock scope
const mockProvProfManagerCreate = jest.fn(() => testProvisioningProfiles);
const mockProvProfManagerUseExisting = jest.fn();
const mockProvProfManagerList = jest.fn(() => testProvisioningProfilesFromApple);
jest.mock('../../../appleApi', () => {
  return {
    ProvisioningProfileManager: jest.fn().mockImplementation(() => ({
      create: mockProvProfManagerCreate,
      useExisting: mockProvProfManagerUseExisting,
      list: mockProvProfManagerList,
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
  mockProvProfManagerCreate.mockClear();
  mockProvProfManagerUseExisting.mockClear();
  mockProvProfManagerList.mockClear();
});

describe('IosProvisioningProfile', () => {
  describe('CreateProvisioningProfile', () => {
    it('Basic Case - Create a Provisioning Profile and save it to Expo Servers', async () => {
      const ctx = getCtxMock();
      const provProfOptions = {
        experienceName: 'testApp',
        bundleIdentifier: 'test.com.app',
        distCert: testIosDistCredential,
        nonInteractive: true,
      };
      const createProvisioningProfile = new CreateProvisioningProfile(provProfOptions);
      await createProvisioningProfile.open(ctx as any);

      // expect provisioning profile is created
      expect(mockProvProfManagerCreate.mock.calls.length).toBe(1);

      // expect provisioning profile is saved to servers
      expect(ctx.ios.updateProvisioningProfile.mock.calls.length).toBe(1);
    });
  });
  describe('CreateOrReuseProvisioningProfile', () => {
    it('Use Autosuggested Provisioning Profile ', async () => {
      const ctx = getCtxMock();
      const provProfOptions = {
        experienceName: 'testApp',
        bundleIdentifier: 'test.com.app',
        distCert: testIosDistCredential,
        nonInteractive: true,
      };
      const createOrReuseProvisioningProfile = new CreateOrReuseProvisioningProfile(
        provProfOptions
      );
      await createOrReuseProvisioningProfile.open(ctx as any);

      // expect to use existing provisioning profile in apple developer portal
      expect(mockProvProfManagerUseExisting.mock.calls.length).toBe(1);

      // expect provisioning profile is saved to servers
      expect(ctx.ios.updateProvisioningProfile.mock.calls.length).toBe(1);

      // expect reuse: fail if provisioning profile is created
      expect(mockProvProfManagerCreate.mock.calls.length).toBe(0);
    });
    it('No Autosuggested Provisioning Profile available, create new profile', async () => {
      // no available certs on apple dev portal
      mockProvProfManagerList.mockImplementation(() => [] as any);

      const ctx = getCtxMock();
      const provProfOptions = {
        experienceName: 'testApp',
        bundleIdentifier: 'test.com.app',
        distCert: testIosDistCredential,
        nonInteractive: true,
      };
      const createOrReuseProvisioningProfile = new CreateOrReuseProvisioningProfile(
        provProfOptions
      );
      const createProvisioningProfile = await createOrReuseProvisioningProfile.open(ctx as any);
      await createProvisioningProfile.open(ctx as any);

      // expect creation: fail if used existing provisioning profile in apple developer portal
      expect(mockProvProfManagerUseExisting.mock.calls.length).toBe(0);

      // expect provisioning profile is saved to servers
      expect(ctx.ios.updateProvisioningProfile.mock.calls.length).toBe(1);

      // expect provisioning profile is created
      expect(mockProvProfManagerCreate.mock.calls.length).toBe(1);
    });
  });
});
