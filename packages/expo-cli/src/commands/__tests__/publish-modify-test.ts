import { vol } from 'memfs';
import { ApiV2 } from '@expo/xdl';

import {
  rollbackPublicationFromChannelAsync,
  setPublishToChannelAsync,
} from '../utils/PublishUtils';
import { jester } from '../../credentials/test-fixtures/mocks';
import { mockExpoXDL } from '../../__tests__/utils';

jest.mock('fs');
jest.mock('resolve-from');

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

  it('Set publication to channel', async () => {
    const setOptions = {
      releaseChannel: 'test-channel',
      publishId: 'test-uuid',
    };
    const postAsync = jest.fn((methodName, data) => {
      return {};
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    await setPublishToChannelAsync(projectRoot, setOptions);

    expect(postAsync.mock.calls.length).toBe(1);
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      releaseChannel: 'test-channel',
      slug: 'testing-123',
      publishId: 'test-uuid',
    });
  });

  it('rollback publication with no history', async () => {
    const rollbackOptions = {
      releaseChannel: 'test-channel',
      sdkVersion: '35.0.0',
      platform: 'ios' as 'ios',
      parent: { nonInteractive: true },
    };
    const postAsync = jest.fn((methodName, data) => {
      if (methodName === 'publish/history')
        return {
          queryResult: [],
        };

      return {};
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    try {
      await rollbackPublicationFromChannelAsync(projectRoot, rollbackOptions);
    } catch (e) {
      expect(e.message).toMatch(/There isn't anything published/);
    }

    expect(postAsync.mock.calls.length).toBe(1);

    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: 'testing-123',
      count: 2,
      owner: jester.username,
      platform: 'ios',
      sdkVersion: '35.0.0',
      version: 2,
    });
  });

  it('rollback publication with limited history', async () => {
    const rollbackOptions = {
      releaseChannel: 'test-channel',
      sdkVersion: '35.0.0',
      platform: 'ios' as 'ios',
      parent: { nonInteractive: true },
    };
    const postAsync = jest.fn((methodName, data) => {
      if (methodName === 'publish/history')
        return {
          queryResult: [
            {
              channel: 'test-channel',
              publicationId: 'test-publication-uuid',
              sdkVersion: '35.0.0',
              platform: 'ios',
            },
          ],
        };

      return {};
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    try {
      await rollbackPublicationFromChannelAsync(projectRoot, rollbackOptions);
    } catch (e) {
      expect(e.message).toMatch(/There is only 1 publication/);
    }

    expect(postAsync.mock.calls.length).toBe(1);

    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: 'testing-123',
      count: 2,
      owner: jester.username,
      platform: 'ios',
      sdkVersion: '35.0.0',
      version: 2,
    });
  });

  it('rollback publication from channel with sufficient history', async () => {
    const rollbackOptions = {
      releaseChannel: 'test-channel',
      sdkVersion: '35.0.0',
      platform: 'ios' as 'ios',
      parent: { nonInteractive: true },
    };
    const postAsync = jest.fn((methodName, data) => {
      if (methodName === 'publish/history')
        return {
          queryResult: [
            {
              channel: 'test-channel',
              publicationId: 'test-publication-uuid',
              sdkVersion: '35.0.0',
              platform: 'ios',
            },
            {
              channel: 'test-channel',
              publicationId: 'test-publication-uuid-1',
              sdkVersion: '35.0.0',
              platform: 'ios',
            },
          ],
        };
      if (methodName === 'publish/details') return { queryResult: { manifest: {} } };

      return {};
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    await rollbackPublicationFromChannelAsync(projectRoot, rollbackOptions);

    expect(postAsync.mock.calls.length).toBe(3);
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: 'testing-123',
      count: 2,
      owner: jester.username,
      platform: 'ios',
      sdkVersion: '35.0.0',
      version: 2,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      slug: 'testing-123',
      publishId: 'test-publication-uuid-1',
      owner: jester.username,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      slug: 'testing-123',
      publishId: 'test-publication-uuid-1',
      releaseChannel: 'test-channel',
    });
  });

  it('rollback publication from channel to all platforms', async () => {
    const rollbackOptions = {
      releaseChannel: 'test-channel',
      sdkVersion: '35.0.0',
      parent: { nonInteractive: true },
    };
    const postAsync = jest.fn((methodName, data) => {
      if (methodName === 'publish/history')
        return {
          queryResult: [
            {
              channel: 'test-channel',
              publicationId: `test-publication-uuid-${data.platform}`,
              sdkVersion: '35.0.0',
              platform: data.platform,
            },
            {
              channel: 'test-channel',
              publicationId: `test-publication-uuid-${data.platform}-1`,
              sdkVersion: '35.0.0',
              platform: data.platform,
            },
          ],
        };
      if (methodName === 'publish/details') return { queryResult: { manifest: {} } };

      return {};
    });
    (ApiV2.clientForUser as jest.Mock).mockReturnValue({ postAsync });

    await rollbackPublicationFromChannelAsync(projectRoot, rollbackOptions);

    expect(postAsync.mock.calls.length).toBe(6);
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: 'testing-123',
      count: 2,
      owner: jester.username,
      platform: 'ios',
      sdkVersion: '35.0.0',
      version: 2,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: 'testing-123',
      count: 2,
      owner: jester.username,
      platform: 'android',
      sdkVersion: '35.0.0',
      version: 2,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      slug: 'testing-123',
      publishId: 'test-publication-uuid-ios-1',
      owner: jester.username,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      slug: 'testing-123',
      publishId: 'test-publication-uuid-android-1',
      owner: jester.username,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      slug: 'testing-123',
      publishId: 'test-publication-uuid-ios-1',
      releaseChannel: 'test-channel',
    });
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      slug: 'testing-123',
      publishId: 'test-publication-uuid-android-1',
      releaseChannel: 'test-channel',
    });
  });
});
