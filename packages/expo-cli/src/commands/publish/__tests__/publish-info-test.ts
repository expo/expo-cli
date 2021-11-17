import { vol } from 'memfs';
import { ApiV2 } from 'xdl';

import { mockExpoXDL } from '../../../__tests__/mock-utils';
import { jester } from '../../../credentials/__tests__/fixtures/mocks-constants';
import { getPublicationDetailAsync, getPublishHistoryAsync } from '../../utils/PublishUtils';

jest.mock('fs');
jest.mock('resolve-from');
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));

mockExpoXDL({
  UserManager: {
    ensureLoggedInAsync: jest.fn(() => jester),
    getCurrentUserAsync: jest.fn(() => jester),
  },
  ApiV2: {
    clientForUser: jest.fn(),
  },
});

describe('publish details', () => {
  const projectRoot = '/test-project';
  const packageJson = JSON.stringify(
    {
      name: 'testing123',
      version: '0.1.0',
      description: 'fake description',
      main: 'index.js',
    },
    null,
    2
  );
  const appJson = JSON.stringify({
    name: 'testing 123',
    version: '0.1.0',
    slug: 'testing-123',
    sdkVersion: '33.0.0',
    owner: jester.username,
  });

  beforeAll(() => {
    vol.fromJSON({
      [projectRoot + '/package.json']: packageJson,
      [projectRoot + '/app.json']: appJson,
    });
  });

  afterAll(() => {
    vol.reset();
  });

  it('Get publication details', async () => {
    const detailOptions = {
      publishId: 'test-uuid',
    };
    const postAsync = jest.fn(() => {
      return { queryResult: {} };
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    await getPublicationDetailAsync(projectRoot, detailOptions);

    expect(postAsync.mock.calls.length).toBe(1);
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      owner: jester.username,
      publishId: 'test-uuid',
      slug: 'testing-123',
    });
  });

  it('Get publication history', async () => {
    const historyOptions = {
      releaseChannel: 'test-channel',
      count: 9,
      platform: 'ios' as 'ios',
      sdkVersion: '35.0.0',
    };
    const postAsync = jest.fn((methodName, data) => {
      return {};
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    await getPublishHistoryAsync(projectRoot, historyOptions);

    expect(postAsync.mock.calls.length).toBe(1);
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      count: 9,
      platform: 'ios',
      releaseChannel: 'test-channel',
      sdkVersion: '35.0.0',
      owner: jester.username,
      slug: 'testing-123',
      version: 2,
    });
  });
});
