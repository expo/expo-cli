'use strict';

let XDL = {
  get Android() { return require('./Android'); },
  get Api() { return require('./Api'); },
  get Config() { return require('./Config'); },
  get Env() { return require('./Env'); },
  get ErrorCode() { return require('./ErrorCode'); },
  get Exp() { return require('./Exp'); },
  get FileSystem() { return require('./FileSystem'); },
  get Project() { return require('./Project'); },
  get ProjectSettings() { return require('./ProjectSettings'); },
  get Simulator() { return require('./Simulator'); },
  get UrlUtils() { return require('./UrlUtils'); },
  get User() { return require('./User'); },
  get UserSettings() { return require('./UserSettings'); },
  get XDLError() { return require('./XDLError'); },
};

module.exports = XDL;
