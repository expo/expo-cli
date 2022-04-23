import { ExpoConfig, getConfig } from '@expo/config';

import { mockExpoXDL } from '../../__tests__/mock-utils';
import { setupAsync } from '../webhooks/utils';
import { actionAsync as updateAsync } from '../webhooks/webhooksUpdateAsync';

jest.mock('@expo/config');

const mockApiClient = {
  getAsync: jest.fn(),
  patchAsync: jest.fn(),
};

mockExpoXDL({
  ApiV2: {
    clientForUser: () => {
      return mockApiClient;
    },
  },
  UserManager: {
    ensureLoggedInAsync: jest.fn(() => ({ username: 'testuser' })),
  },
});

const config: ExpoConfig = {
  owner: 'ownername',
  slug: 'project',
  name: 'ProjectName',
  version: '1.0.0',
  platforms: ['android'],
};
const getConfigMock = getConfig as jest.MockedFunction<typeof getConfig>;
getConfigMock.mockReturnValue({
  exp: config,
  pkg: {},
  rootConfig: { expo: config },
  staticConfigPath: '/tmp/project/app.json',
  dynamicConfigPath: null,
  dynamicConfigObjectType: null,
});

beforeEach(() => {
  mockApiClient.getAsync.mockClear();
  mockApiClient.patchAsync.mockClear();
});

test('setupAsync uses owner name (when given) in the experience name', async () => {
  mockApiClient.getAsync.mockReturnValue([
    {
      id: 'project-id-0',
    },
  ]);
  await setupAsync('/tmp/project');
  expect(mockApiClient.getAsync).toBeCalledWith('projects', {
    experienceName: '@ownername/project',
  });
});

test('updateAsync calls the API with HTTP PATCH', async () => {
  const url = 'https://example.com/hook';
  await updateAsync('/tmp/project', {
    id: 'webhook-id-0',
    url,
  });
  expect(mockApiClient.patchAsync.mock.calls).toEqual([
    ['projects/project-id-0/webhooks/webhook-id-0', { url }],
  ]);

  mockApiClient.patchAsync.mockClear();
  const secret = 'ba0babba0babba0bab';
  await updateAsync('/tmp/project', {
    id: 'webhook-id-0',
    secret,
  });
  expect(mockApiClient.patchAsync.mock.calls).toEqual([
    ['projects/project-id-0/webhooks/webhook-id-0', { secret }],
  ]);
});
