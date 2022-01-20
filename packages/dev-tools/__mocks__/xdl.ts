const xdl = jest.genMockFromModule('xdl') as typeof import('xdl');

xdl.UrlUtils = {
  ...xdl.UrlUtils,
  constructDeepLinkAsync(projectDir) {
    return this.constructManifestUrlAsync(projectDir);
  },
  async constructManifestUrlAsync(projectDir) {
    return 'exp://mock-manifest-url';
  },
};

module.exports = xdl;
