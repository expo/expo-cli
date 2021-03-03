import { ModuleVersion } from '@expo/development-support';

const packageJSON = require('../package.json');

const ModuleVersionChecker = ModuleVersion.createModuleVersionChecker(
  packageJSON.name,
  packageJSON.version
);

async function checkForUpdateAsync() {
  return await ModuleVersionChecker.checkAsync();
}

export default {
  checkForUpdateAsync,
};
