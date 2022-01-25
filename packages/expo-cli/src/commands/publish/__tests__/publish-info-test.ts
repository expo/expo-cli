import { Publish } from '@expo/dev-api';
import { vol } from 'memfs';

import { mockExpoAPI } from '../../../__tests__/mock-utils';
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

mockExpoAPI({
  Publish: {
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
  const projectRoot = '/test-project';

  beforeAll(() => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'testing123',
          version: '0.1.0',
          description: 'fake description',
          main: 'index.js',
        }),
        'app.json': JSON.stringify({
          name: 'testing 123',
          version: '0.1.0',
          slug: 'testing-123',
          sdkVersion: '33.0.0',
          owner: jester.username,
        }),
      },
      projectRoot
    );
  });

  beforeEach(() => {
    (Publish.getPublishHistoryAsync as jest.Mock).mockReset();
    (Publish.getPublicationDetailAsync as jest.Mock).mockReset();
  });

  afterAll(() => {
    vol.reset();
  });

  it('Get publication details', async () => {
    const detailOptions = {
      publishId: 'test-uuid',
    };
    (Publish.getPublicationDetailAsync as jest.Mock).mockReturnValue({});

    await getPublicationDetailAsync(projectRoot, detailOptions);

    expect(Publish.getPublicationDetailAsync).toHaveBeenCalledTimes(1);
    expect(Publish.getPublicationDetailAsync).toHaveBeenCalledWith(jester, {
      exp: expect.anything(),
      options: {
        publishId: 'test-uuid',
      },
    });
  });

  it('Get publication history', async () => {
    const historyOptions = {
      releaseChannel: 'test-channel',
      count: 9,
      platform: 'ios' as 'ios',
      sdkVersion: '35.0.0',
    };

    (Publish.getPublishHistoryAsync as jest.Mock).mockReturnValue({});

    await getPublishHistoryAsync(projectRoot, historyOptions);

    expect(Publish.getPublishHistoryAsync).toHaveBeenCalledTimes(1);
    expect(Publish.getPublishHistoryAsync).toHaveBeenCalledWith(jester, {
      exp: expect.anything(),
      options: {
        count: 9,
        platform: 'ios',
        releaseChannel: 'test-channel',
        sdkVersion: '35.0.0',
      },
      version: 2,
    });
  });
});
