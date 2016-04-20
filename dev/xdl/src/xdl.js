'use strict';

let XDL = {
  get Android() { return require('./Android'); },
  get Api() { return require('./Api'); },
  get Config() { return require('./Config'); },
  get Exp() { return require('./Exp'); },
  get FileSystem() { return require('./FileSystem'); },
  get Login() { return require('./Login'); },
  get PackagerController() { return require('./PackagerController'); },
  get ProjectSettings() { return require('./ProjectSettings'); },
  get RunPackager() { return require('./RunPackager'); },
  get Simulator() { return require('./Simulator'); },
  get UrlUtils() { return require('./UrlUtils'); },
  get UserSettings() { return require('./UserSettings'); },
};

module.exports = XDL;
