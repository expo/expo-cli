import { Publish } from '@expo/dev-api';
import { vol } from 'memfs';

import { mockExpoAPI } from '../../../__tests__/mock-utils';
import { createTestProject } from '../../../__tests__/project-utils';
import { jester } from '../../../credentials/__tests__/fixtures/mocks-constants';
import {
  rollbackPublicationFromChannelAsync,
  setPublishToChannelAsync,
} from '../../utils/PublishUtils';

jest.mock('fs');
jest.mock('os');
jest.mock('resolve-from');
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));

mockExpoAPI({
  Publish: {
    setPublishToChannelAsync: jest.fn(
      jest.requireActual('@expo/dev-api').Publish.setPublishToChannelAsync
    ),
    getPublicationDetailAsync: jest.fn(
      jest.requireActual('@expo/dev-api').Publish.getPublicationDetailAsync
    ),
    getPublishHistoryAsync: jest.fn(
      jest.requireActual('@expo/dev-api').Publish.getPublishHistoryAsync
    ),
    getProjectOwner: jest.fn(jest.requireActual('@expo/dev-api').Publish.getProjectOwner),
  },
  UserManager: {
    ensureLoggedInAsync: jest.fn(() => jester),
    getCurrentUserAsync: jest.fn(() => jester),
  },
  ApiV2: {
    clientForUser: jest.fn(),
  },
});

describe('publish details', () => {
  const testProject = createTestProject(jester);

  beforeAll(() => {
    vol.fromJSON(testProject.projectTree);
  });

  beforeEach(() => {
    (Publish.getPublishHistoryAsync as jest.Mock).mockReset();
    (Publish.getPublicationDetailAsync as jest.Mock).mockReset();
    (Publish.setPublishToChannelAsync as jest.Mock).mockReset();
  });

  afterAll(() => {
    vol.reset();
  });

  it('Set publication to channel', async () => {
    const setOptions = {
      releaseChannel: 'test-channel',
      publishId: 'test-uuid',
    };
    (Publish.setPublishToChannelAsync as jest.Mock).mockReturnValue({});

    await setPublishToChannelAsync(testProject.projectRoot, setOptions);

    expect((Publish.setPublishToChannelAsync as jest.Mock).mock.calls.length).toBe(1);
    expect(Publish.setPublishToChannelAsync).toHaveBeenCalledWith(jester, {
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

    (Publish.getPublishHistoryAsync as jest.Mock).mockReturnValue([]);

    expect.assertions(3);

    try {
      await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);
    } catch (e) {
      expect(e.message).toMatch(/There isn't anything published/);
    }

    expect(Publish.getPublishHistoryAsync).toHaveBeenCalledTimes(1);
    expect(Publish.getPublishHistoryAsync).toHaveBeenCalledWith(jester, {
      exp: expect.anything(),
      options: {
        releaseChannel: 'test-channel',
        count: 2,
        runtimeVersion: undefined,
        platform: 'ios',
        sdkVersion: '35.0.0',
      },
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
    (Publish.getPublishHistoryAsync as jest.Mock).mockReturnValue([
      {
        channel: 'test-channel',
        publicationId: 'test-publication-uuid',
        sdkVersion: '35.0.0',
        platform: 'ios',
      },
    ]);

    expect.assertions(3);

    try {
      await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);
    } catch (e) {
      expect(e.message).toMatch(/There is only 1 publication/);
    }

    expect(Publish.getPublishHistoryAsync).toHaveBeenCalledTimes(1);
    expect(Publish.getPublishHistoryAsync).toHaveBeenCalledWith(jester, {
      exp: expect.anything(),
      options: {
        releaseChannel: 'test-channel',
        count: 2,
        runtimeVersion: undefined,
        platform: 'ios',
        sdkVersion: '35.0.0',
      },
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
    (Publish.getPublishHistoryAsync as jest.Mock).mockReturnValue([
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
    ]);
    (Publish.getPublicationDetailAsync as jest.Mock).mockReturnValue({ manifest: {} });
    (Publish.setPublishToChannelAsync as jest.Mock).mockReturnValue({});

    // Actual invocation
    await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);

    expect(Publish.getPublishHistoryAsync).toBeCalledTimes(1);
    expect(Publish.getPublishHistoryAsync).toBeCalledWith(jester, {
      exp: expect.anything(),
      options: {
        releaseChannel: 'test-channel',
        count: 2,
        runtimeVersion: undefined,
        platform: 'ios',
        sdkVersion: '35.0.0',
      },
      version: 2,
    });

    expect(Publish.getPublicationDetailAsync).toBeCalledTimes(1);
    expect(Publish.getPublicationDetailAsync).toBeCalledWith(jester, {
      exp: expect.anything(),
      options: {
        publishId: 'test-publication-uuid-1',
      },
    });

    expect(Publish.setPublishToChannelAsync).toBeCalledTimes(1);
    expect(Publish.setPublishToChannelAsync).toBeCalledWith(jester, {
      publishId: 'test-publication-uuid-1',
      releaseChannel: 'test-channel',
      slug: 'testing-123',
    });
  });

  it('rollback publication from channel to all platforms', async () => {
    const rollbackOptions = {
      releaseChannel: 'test-channel',
      sdkVersion: '35.0.0',
      parent: { nonInteractive: true },
    };

    (Publish.getPublishHistoryAsync as jest.Mock) = jest.fn((user, { options: { platform } }) => {
      return [
        {
          channel: 'test-channel',
          publicationId: `test-publication-uuid-${platform}`,
          sdkVersion: '35.0.0',
          platform,
        },
        {
          channel: 'test-channel',
          publicationId: `test-publication-uuid-${platform}-1`,
          sdkVersion: '35.0.0',
          platform,
        },
      ];
    });

    (Publish.getPublicationDetailAsync as jest.Mock).mockReturnValue({ manifest: {} });
    (Publish.setPublishToChannelAsync as jest.Mock).mockReturnValue({});

    await rollbackPublicationFromChannelAsync(testProject.projectRoot, rollbackOptions);

    expect(Publish.getPublishHistoryAsync).toBeCalledTimes(2);
    expect(Publish.getPublishHistoryAsync).toHaveBeenNthCalledWith(1, jester, {
      exp: expect.anything(),
      options: {
        releaseChannel: 'test-channel',
        count: 2,
        runtimeVersion: undefined,
        platform: 'android',
        sdkVersion: '35.0.0',
      },
      version: 2,
    });
    expect(Publish.getPublishHistoryAsync).toHaveBeenNthCalledWith(2, jester, {
      exp: expect.anything(),
      options: {
        releaseChannel: 'test-channel',
        count: 2,
        runtimeVersion: undefined,
        platform: 'ios',
        sdkVersion: '35.0.0',
      },
      version: 2,
    });

    expect(Publish.getPublicationDetailAsync).toBeCalledTimes(2);
    expect(Publish.getPublicationDetailAsync).toHaveBeenNthCalledWith(1, jester, {
      exp: expect.anything(),
      options: {
        publishId: 'test-publication-uuid-android-1',
      },
    });
    expect(Publish.getPublicationDetailAsync).toHaveBeenNthCalledWith(2, jester, {
      exp: expect.anything(),
      options: {
        publishId: 'test-publication-uuid-ios-1',
      },
    });

    expect(Publish.setPublishToChannelAsync).toBeCalledTimes(2);
    expect(Publish.setPublishToChannelAsync).toHaveBeenNthCalledWith(1, jester, {
      publishId: 'test-publication-uuid-android-1',
      releaseChannel: 'test-channel',
      slug: 'testing-123',
    });
    expect(Publish.setPublishToChannelAsync).toHaveBeenNthCalledWith(2, jester, {
      publishId: 'test-publication-uuid-ios-1',
      releaseChannel: 'test-channel',
      slug: 'testing-123',
    });
  });
});
