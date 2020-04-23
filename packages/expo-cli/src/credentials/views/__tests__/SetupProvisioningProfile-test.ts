import {
  getCtxMock,
  testIosDistCredential,
  testProvisioningProfiles,
  testProvisioningProfilesFromApple,
} from '../../test-fixtures/mocks';
import { SetupIosProvisioningProfile } from '../SetupIosProvisioningProfile';
import { IosDistCredentials } from '../../credentials';

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

describe('SetupProvisioningProfile', () => {
  it('Basic Case - Create or Reuse', async () => {
    const ctx = getCtxMock();
    const provProfOptions = {
      experienceName: 'testApp',
      bundleIdentifier: 'test.com.app',
      distCert: testIosDistCredential as IosDistCredentials,
      nonInteractive: true,
    };
    const setupProvisioningProfile = new SetupIosProvisioningProfile(provProfOptions);
    const createOrReuse = await setupProvisioningProfile.open(ctx as any);
    await createOrReuse.open(ctx as any);

    // expect to use existing provisioning profile in apple developer portal
    expect(mockProvProfManagerUseExisting.mock.calls.length).toBe(1);

    // expect provisioning profile is saved to servers
    expect(ctx.ios.updateProvisioningProfile.mock.calls.length).toBe(1);
  });
});
