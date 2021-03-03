const library = jest.genMockFromModule('@expo/development-support');

library.UrlUtils = {
  constructDeepLinkAsync(projectDir) {
    return this.constructManifestUrlAsync(projectDir);
  },
  constructManifestUrlAsync(projectDir) {
    return 'exp://mock-manifest-url';
  },
};

library.ProjectSettings = {
  readAsync(projectDir) {
    return Promise.resolve({
      hostType: 'lan',
    });
  },
  getCurrentStatusAsync() {
    return Promise.resolve('running');
  },
};

library.ProjectUtils = {
  readConfigJsonAsync(project) {
    return Promise.resolve({
      name: 'Project Name',
      description: 'Project Description',
      slug: 'project-slug',
    });
  },
  logError(projectRoot, tag, message, id) {},
};

library.UserSettings = {
  readAsync() {
    return Promise.resolve({
      sendTo: 'fake-send-to',
    });
  },
};

library.Config = {
  offline: false,
};

module.exports = library;
