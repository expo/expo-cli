const xdl = jest.genMockFromModule('xdl');

xdl.UrlUtils = {
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
};

xdl.ProjectUtils = {
  readConfigJsonAsync(project) {
    return Promise.resolve({
      name: 'Project Name',
      description: 'Project Description',
      slug: 'project-slug',
    });
  },
};

xdl.UserSettings = {
  readAsync() {
    return Promise.resolve({
      sendTo: 'fake-send-to',
    });
  },
};

module.exports = xdl;
