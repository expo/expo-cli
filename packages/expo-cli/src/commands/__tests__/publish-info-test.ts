import { vol } from 'memfs';
import { ApiV2 } from '@expo/xdl';

import { getPublicationDetailAsync, getPublishHistoryAsync } from '../utils/PublishUtils';

jest.mock('fs');
jest.mock('resolve-from');
jest.mock('ora', () =>
  jest.fn(() => {
    return {
      start: jest.fn(() => {
        return { stop: jest.fn(), succeed: jest.fn() };
      }),
    };
  })
);
jest.mock('@expo/xdl', () => {
  const user = {
    kind: 'user',
    username: 'test-username',
    nickname: 'test-nickname',
    userId: 'test-id',
    picture: 'test-pic',
    currentConnection: 'Username-Password-Authentication',
    sessionSecret: 'test-session-secret',
  };
  const pkg = jest.requireActual('@expo/xdl');
  return {
    ...pkg,
    UserManager: {
      ...pkg.UserManager,
      ensureLoggedInAsync: jest.fn(() => user),
      getCurrentUserAsync: jest.fn(() => user),
    },
    ApiV2: {
      ...pkg.clientForUser,
      clientForUser: jest.fn(),
    },
  };
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
    owner: 'test-user',
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
      owner: 'test-user',
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
      owner: 'test-user',
      slug: 'testing-123',
      version: 2,
    });
  });
});
