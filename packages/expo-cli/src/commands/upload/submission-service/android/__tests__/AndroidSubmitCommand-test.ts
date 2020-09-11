import { vol } from 'memfs';
import { v4 as uuidv4 } from 'uuid';

import { mockExpoXDL } from '../../../../../__tests__/mock-utils';
import { createTestProject } from '../../../../../__tests__/project-utils';
import { jester } from '../../../../../__tests__/user-fixtures';
import { ensureProjectExistsAsync } from '../../../../../projects';
import SubmissionService from '../../SubmissionService';
import { Platform, Submission, SubmissionStatus } from '../../SubmissionService.types';
import { SubmissionMode } from '../../types';
import { runTravelingFastlaneAsync } from '../../utils/travelingFastlane';
import { ArchiveType, ReleaseStatus, ReleaseTrack } from '../AndroidSubmissionConfig';
import AndroidSubmitCommand from '../AndroidSubmitCommand';
import { AndroidOnlineSubmissionConfig } from '../AndroidSubmitter';
import { AndroidSubmitCommandOptions } from '../types';

jest.mock('fs');
jest.mock('../../SubmissionService');
jest.mock('../../utils/travelingFastlane');
jest.mock('../../../../../projects');
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
});

describe(AndroidSubmitCommand, () => {
  const testProject = createTestProject(jester, {
    android: {
      package: 'com.expo.test.project',
    },
  });
  const fakeFiles: Record<string, string> = {
    '/apks/fake.apk': 'fake apk',
    '/google-service-account.json': JSON.stringify({ service: 'account' }),
  };

  beforeAll(() => {
    vol.fromJSON({
      ...testProject.projectTree,
      ...fakeFiles,
    });
  });
  afterAll(() => {
    vol.reset();
  });

  afterEach(() => {
    (ensureProjectExistsAsync as jest.Mock).mockClear();
  });

  describe('online mode', () => {
    const originalStartSubmissionAsync = SubmissionService.startSubmissionAsync;
    const originalGetSubmissionAsync = SubmissionService.getSubmissionAsync;
    beforeAll(() => {
      SubmissionService.startSubmissionAsync = jest.fn(SubmissionService.startSubmissionAsync);
      SubmissionService.getSubmissionAsync = jest.fn(SubmissionService.getSubmissionAsync);
    });
    afterAll(() => {
      SubmissionService.startSubmissionAsync = originalStartSubmissionAsync;
      SubmissionService.getSubmissionAsync = originalGetSubmissionAsync;
    });
    afterEach(() => {
      (SubmissionService.startSubmissionAsync as jest.Mock).mockClear();
      (SubmissionService.getSubmissionAsync as jest.Mock).mockClear();
    });

    it('sends a request to Submission Service', async () => {
      const projectId = uuidv4();
      (SubmissionService.getSubmissionAsync as jest.Mock).mockImplementationOnce(
        async (projectId: string, submissionId: string): Promise<Submission> => {
          const actualSubmission = await originalGetSubmissionAsync(projectId, submissionId);
          return {
            ...actualSubmission,
            status: SubmissionStatus.FINISHED,
          };
        }
      );
      (ensureProjectExistsAsync as jest.Mock).mockImplementationOnce(() => projectId);

      const options: AndroidSubmitCommandOptions = {
        url: 'http://expo.io/fake.apk',
        type: 'apk',
        key: '/google-service-account.json',
        track: 'internal',
        releaseStatus: 'draft',
      };
      const ctx = AndroidSubmitCommand.createContext(
        SubmissionMode.online,
        testProject.projectRoot,
        options
      );
      const command = new AndroidSubmitCommand(ctx);
      await command.runAsync();

      const androidSubmissionConfig: AndroidOnlineSubmissionConfig = {
        archiveUrl: 'http://expo.io/fake.apk',
        archiveType: ArchiveType.apk,
        androidPackage: testProject.appJSON.expo.android?.package,
        serviceAccount: fakeFiles['/google-service-account.json'],
        releaseStatus: ReleaseStatus.draft,
        track: ReleaseTrack.internal,
        projectId,
      };

      expect(SubmissionService.startSubmissionAsync).toHaveBeenCalledWith(
        Platform.ANDROID,
        projectId,
        androidSubmissionConfig
      );
    });
  });

  describe('offline mode', () => {
    afterEach(() => {
      (runTravelingFastlaneAsync as jest.Mock).mockClear();
    });

    it('executes supply_android from traveling-fastlane', async () => {
      const options: AndroidSubmitCommandOptions = {
        path: '/apks/fake.apk',
        type: 'apk',
        key: '/google-service-account.json',
        track: 'internal',
        releaseStatus: 'draft',
      };
      const ctx = AndroidSubmitCommand.createContext(
        SubmissionMode.offline,
        testProject.projectRoot,
        options
      );
      const command = new AndroidSubmitCommand(ctx);
      await command.runAsync();

      expect(runTravelingFastlaneAsync).toHaveBeenCalledWith(
        expect.stringMatching(/supply_android$/),
        [
          '/apks/fake.apk',
          testProject.appJSON.expo.android?.package,
          '/google-service-account.json',
          'internal',
          'apk',
          'draft',
        ]
      );
    });
  });
});
