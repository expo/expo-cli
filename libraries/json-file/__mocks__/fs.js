const mockFs = jest.genMockFromModule('fs');

const { Volume, createFsFromVolume } = require('memfs');
const mockVolume = new Volume();
const memfs = createFsFromVolume(mockVolume);

Object.getOwnPropertyNames(memfs).forEach(memfsProp => {
  const propertyValue = memfs[memfsProp];
  if (typeof propertyValue === 'function') {
    mockFs[memfsProp] = jest.fn(propertyValue.bind(memfs));
  } else {
    mockFs[memfsProp] = propertyValue;
  }
});

mockFs.__volume = mockVolume;
module.exports = mockFs;
