import { ModuleVersion } from '@expo/xdl';

// @ts-ignore: expo-cli is not listed in its own dependencies
import packageJSON from 'expo-cli/package.json';

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
