const api = jest.genMockFromModule('@expo/api') as typeof import('@expo/api');

api.ProjectSettings = {
  ...api.ProjectSettings,
  readAsync(projectDir) {
    return Promise.resolve({
      hostType: 'lan',
    }) as any;
  },
  getCurrentStatusAsync() {
    return Promise.resolve('running');
  },
};

api.UserSettings.readAsync = () => {
  return Promise.resolve({
    sendTo: 'fake-send-to',
  });
};

api.ProcessSettings = {
  ...api.ProcessSettings,
  isOffline: false,
};

module.exports = api;
