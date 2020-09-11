import { vol } from 'memfs';

import AndroidBuilder from '../AndroidBuilder';

jest.mock('fs');
jest.mock('../../../../../credentials/context', () => {
  return {
    Context: jest.fn().mockImplementation(() => ({
      init: jest.fn(),
    })),
  };
});

const credentialsJson = {
  android: {
    keystore: {
      keystorePath: 'keystore.jks',
      keystorePassword: 'keystorePassword',
      keyAlias: 'keyAlias',
      keyPassword: 'keyPassword',
    },
  },
};
const projectUrl = 'http://fakeurl.com';

const keystore = {
  content: 'somebinarycontent',
  base64: 'c29tZWJpbmFyeWNvbnRlbnQ=',
};

function setupCredentialsConfig() {
  vol.fromJSON({
    './credentials.json': JSON.stringify(credentialsJson),
    './keystore.jks': keystore.content,
  });
}

beforeEach(() => {
  vol.reset();
});

describe('AndroidBuilder', () => {
  describe('preparing generic job', () => {
    it('should prepare valid job', async () => {
      setupCredentialsConfig();
      const ctx: any = {
        platform: 'android',
        buildProfile: {
          credentialsSource: 'local',
          workflow: 'generic',
        },
        commandCtx: {
          projectDir: '.',
          user: jest.fn(),
        },
      };
      const builder = new AndroidBuilder(ctx);
      await builder.ensureCredentialsAsync();
      const job = await builder.prepareJobAsync(projectUrl);
      expect(job).toEqual({
        platform: 'android',
        type: 'generic',
        projectUrl,
        artifactPath: 'android/app/build/outputs/**/*.{apk,aab}',
        gradleCommand: ':app:bundleRelease',
        secrets: {
          keystore: {
            dataBase64: keystore.base64,
            keystorePassword: 'keystorePassword',
            keyAlias: 'keyAlias',
            keyPassword: 'keyPassword',
          },
        },
      });
    });
  });

  describe('preparing managed job', () => {
    it('should prepare valid job', async () => {
      setupCredentialsConfig();
      const ctx: any = {
        platform: 'android',
        buildProfile: {
          credentialsSource: 'local',
          workflow: 'managed',
        },
        commandCtx: {
          projectDir: '.',
          user: jest.fn(),
        },
      };
      const builder = new AndroidBuilder(ctx);
      await builder.ensureCredentialsAsync();
      const job = await builder.prepareJobAsync(projectUrl);
      expect(job).toEqual({
        platform: 'android',
        type: 'managed',
        projectUrl,
        packageJson: { example: 'packageJson' },
        manifest: { example: 'manifest' },
        secrets: {
          keystore: {
            dataBase64: keystore.base64,
            keystorePassword: 'keystorePassword',
            keyAlias: 'keyAlias',
            keyPassword: 'keyPassword',
          },
        },
      });
    });
  });
});
