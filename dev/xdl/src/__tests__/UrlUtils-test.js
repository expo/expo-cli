/*jest.mock('analytics-node');
jest.mock('diskusage');
jest.mock('fs');
jest.mock('../Env');

const UrlUtils = require('../UrlUtils');
const fs = require('fs');

const projectPath = '/project';
fs.__setMockFilesystem({
  'project': {
    '.exponent': {
      'settings.json': JSON.stringify({
        "hostType": "tunnel",
        "dev": true,
        "strict": false,
        "minify": false,
        "urlType": "exp",
        "urlRandomness": "ab-cde",
      }),
      'packager-info.json': JSON.stringify({
        "packagerPort": 19001,
        "exponentServerPort": 19000,
        "exponentServerNgrokUrl": "http://ab-cde.jesse.test-project.exp.direct",
        "packagerNgrokUrl": "https://packager.ab-cde.jesse.test-project.exp.direct",
      }),
    },
    'exp.json': JSON.stringify({
      sdkVersion: '11.0.0',
    }),
  },
});

describe('constructBundleUrlAsync', () => {
  it('returns the correct default packager url', async () => {
    let packagerUrl = await UrlUtils.constructBundleUrlAsync(projectPath, {});
    expect(packagerUrl).toEqual('exp://packager.ab-cde.jesse.test-project.exp.direct:80');
  });

  it('returns the correct http packager url', async () => {
    let packagerUrl = await UrlUtils.constructBundleUrlAsync(projectPath, {
      urlType: 'http',
    });
    expect(packagerUrl).toEqual('http://packager.ab-cde.jesse.test-project.exp.direct:80');
  });

  it('returns the correct localhost packager url', async () => {
    let packagerUrl = await UrlUtils.constructBundleUrlAsync(projectPath, {
      hostType: 'localhost',
    });
    expect(packagerUrl).toEqual('exp://localhost:19001');
  });
});

describe('constructManifestUrlAsync', () => {
  it('returns the correct default manifest url', async () => {
    let packagerUrl = await UrlUtils.constructManifestUrlAsync(projectPath, {});
    expect(packagerUrl).toEqual('exp://ab-cde.jesse.test-project.exp.direct:80');
  });

  it('returns the correct http manifest url', async () => {
    let packagerUrl = await UrlUtils.constructManifestUrlAsync(projectPath, {
      urlType: 'http',
    });
    expect(packagerUrl).toEqual('http://ab-cde.jesse.test-project.exp.direct:80');
  });

  it('returns the correct localhost manifest url', async () => {
    let packagerUrl = await UrlUtils.constructManifestUrlAsync(projectPath, {
      hostType: 'localhost',
    });
    expect(packagerUrl).toEqual('exp://localhost:19000');
  });
});

describe('constructPublishUrlAsync', () => {
  it('returns the correct publish url', async () => {
    let packagerUrl = await UrlUtils.constructPublishUrlAsync(projectPath, 'test-project-entry-point');
    expect(packagerUrl).toEqual('http://localhost:19001/test-project-entry-point.bundle?dev=false&minify=true&hot=false&assetPlugin=exponent/tools/hashAssetFiles');
  });
});
*/
