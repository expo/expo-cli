const mockfs = require('mock-fs');

const container = {
  __internalFs: null,
  __configureFs: (conf) => {
    container.__internalFs = mockfs.fs(conf);
  },
  __mockFile: mockfs.file,
  __mockDirectory: mockfs.directory,
  __mockSymlink: mockfs.symlink,
};

const proxyfs = new Proxy(container, {
  get: function (target, property, receiver) {
    if (target.hasOwnProperty(property)) {
      return target[property];
    } else {
      if (target.__internalFs === null) {
        target.__internalFs = mockfs.fs();
      }

      return target.__internalFs[property];
    }
  }
});

module.exports = proxyfs;
