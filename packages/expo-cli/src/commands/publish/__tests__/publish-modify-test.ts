import { ApiV2 } from '@expo/api';
import { vol } from 'memfs';

import { createTestProject } from '../../../__tests__/project-utils';
import { jester } from '../../../credentials/__tests__/fixtures/mocks-constants';
import {
  rollbackPublicationFromChannelAsync,
  setPublishToChannelAsync,
} from '../../utils/PublishUtils';

jest.mock('fs');
jest.mock('resolve-from');
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));

jest.mock('@expo/api', () => {
  const api = jest.requireActual('@expo/api');
  return {
    ...api,
    UserManager: {
      getProjectOwner: jest.fn(jest.requireActual('xdl').UserManager.getProjectOwner),
      ensureLoggedInAsync: jest.fn(() => jester),
      getCurrentUserAsync: jest.fn(() => jester),
    },
    ApiV2: {
      clientForUser: jest.fn(),
    },
  };
});

describe('publish details', () => {
  const testProject = createTestProject(jester);

  beforeAll(() => {
    vol.fromJSON(testProject.projectTree);
  });

  afterAll(() => {
    vol.reset();
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

    await setPublishToChannelAsync(testProject.projectRoot, setOptions);

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
      await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);
    } catch (e) {
      expect(e.message).toMatch(/There isn't anything published/);
    }

    expect(postAsync.mock.calls.length).toBe(1);

    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: testProject.appJSON.expo.slug,
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
      await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);
    } catch (e) {
      expect(e.message).toMatch(/There is only 1 publication/);
    }

    expect(postAsync.mock.calls.length).toBe(1);

    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: testProject.appJSON.expo.slug,
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

    await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);

    expect(postAsync.mock.calls.length).toBe(3);
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: testProject.appJSON.expo.slug,
      count: 2,
      owner: jester.username,
      platform: 'ios',
      sdkVersion: '35.0.0',
      version: 2,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      slug: testProject.appJSON.expo.slug,
      publishId: 'test-publication-uuid-1',
      owner: jester.username,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      slug: testProject.appJSON.expo.slug,
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

    await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);

    expect(postAsync.mock.calls.length).toBe(6);
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: testProject.appJSON.expo.slug,
      count: 2,
      owner: jester.username,
      platform: 'ios',
      sdkVersion: '35.0.0',
      version: 2,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/history', {
      releaseChannel: 'test-channel',
      slug: testProject.appJSON.expo.slug,
      count: 2,
      owner: jester.username,
      platform: 'android',
      sdkVersion: '35.0.0',
      version: 2,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      slug: testProject.appJSON.expo.slug,
      publishId: 'test-publication-uuid-ios-1',
      owner: jester.username,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/details', {
      slug: testProject.appJSON.expo.slug,
      publishId: 'test-publication-uuid-android-1',
      owner: jester.username,
    });
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      slug: testProject.appJSON.expo.slug,
      publishId: 'test-publication-uuid-ios-1',
      releaseChannel: 'test-channel',
    });
    expect(postAsync).toHaveBeenCalledWith('publish/set', {
      slug: testProject.appJSON.expo.slug,
      publishId: 'test-publication-uuid-android-1',
      releaseChannel: 'test-channel',
    });
  });
});
