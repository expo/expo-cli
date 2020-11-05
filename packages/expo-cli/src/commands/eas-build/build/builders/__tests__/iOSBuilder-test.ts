import { vol } from 'memfs';

import iOSBuilder from '../iOSBuilder';

jest.mock('fs');
jest.mock('../../../../../git');
jest.mock('../../../../../credentials/context', () => {
  return {
    Context: jest.fn().mockImplementation(() => ({
      init: jest.fn(),
    })),
  };
});
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));

const credentialsJson = {
  ios: {
    provisioningProfilePath: './pprofile',
    distributionCertificate: {
      path: 'cert.p12',
      password: 'certPass',
    },
  },
};
const projectUrl = 'http://fakeurl.com';

const pprofile = {
  content: 'pprofilecontent',
  base64: 'cHByb2ZpbGVjb250ZW50',
};

const cert = {
  content: 'certp12content',
  base64: 'Y2VydHAxMmNvbnRlbnQ=',
};

function setupCredentialsConfig() {
  vol.fromJSON({
    './credentials.json': JSON.stringify(credentialsJson),
    './pprofile': pprofile.content,
    './cert.p12': cert.content,
  });
}

beforeEach(() => {
  vol.reset();
});

describe('iOSBuilder', () => {
  describe('preparing generic job', () => {
    it('should prepare valid job', async () => {
      setupCredentialsConfig();
      const ctx: any = {
        platform: 'ios',
        buildProfile: {
          credentialsSource: 'local',
          workflow: 'generic',
          scheme: 'testapp',
        },
        commandCtx: {
          projectDir: '.',
          user: jest.fn(),
          exp: { ios: { bundleIdentifier: 'example.bundle.identifier' } },
        },
      };
      const builder = new iOSBuilder(ctx);
      await builder.setupAsync();
      await builder.ensureCredentialsAsync();
      const job = await builder.prepareJobAsync(projectUrl);
      expect(job).toEqual({
        platform: 'ios',
        type: 'generic',
        projectUrl,
        scheme: 'testapp',
        artifactPath: 'ios/build/App.ipa',
        projectRootDirectory: '.',
        secrets: {
          buildCredentials: {
            distributionCertificate: {
              dataBase64: cert.base64,
              password: 'certPass',
            },
            provisioningProfileBase64: pprofile.base64,
          },
        },
      });
    }, 10000);
  });

  describe('preparing managed job', () => {
    it('should prepare valid job', async () => {
      setupCredentialsConfig();
      const ctx: any = {
        platform: 'ios',
        buildProfile: {
          credentialsSource: 'local',
          workflow: 'managed',
        },
        commandCtx: {
          projectDir: '.',
          user: jest.fn(),
          exp: { ios: { bundleIdentifier: 'example.bundle.identifier' } },
        },
      };
      const builder = new iOSBuilder(ctx);
      await builder.ensureCredentialsAsync();
      const job = await builder.prepareJobAsync(projectUrl);
      expect(job).toEqual({
        platform: 'ios',
        type: 'managed',
        projectUrl,
        projectRootDirectory: '.',
        secrets: {
          buildCredentials: {
            distributionCertificate: {
              dataBase64: cert.base64,
              password: 'certPass',
            },
            provisioningProfileBase64: pprofile.base64,
          },
        },
      });
    });
  });
});
