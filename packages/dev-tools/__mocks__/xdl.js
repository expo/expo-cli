const xdl = jest.genMockFromModule('xdl');

xdl.UrlUtils = {
  constructDeepLinkAsync(projectDir) {
    return this.constructManifestUrlAsync(projectDir);
  },
  constructManifestUrlAsync(projectDir) {
    return 'exp://mock-manifest-url';
  },
};

xdl.ProjectSettings = {
  readAsync(projectDir) {
    return Promise.resolve({
      hostType: 'lan',
    });
  },
  getCurrentStatusAsync() {
    return Promise.resolve('running');
  },
};

xdl.UserSettings = {
  readAsync() {
    return Promise.resolve({
      sendTo: 'fake-send-to',
    });
  },
};

xdl.Config = {
  offline: false,
};

module.exports = xdl;
