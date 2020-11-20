'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_extra_1 = __importDefault(require('fs-extra'));

const validators_1 = require('../validators');
const BackgroundAsset_1 = __importDefault(require('./BackgroundAsset'));
const ImageAsset_1 = __importDefault(require('./ImageAsset'));
const Info_plist_1 = __importDefault(require('./Info.plist'));
const Storyboard_1 = __importDefault(require('./Storyboard'));
const pbxproj_1 = __importDefault(require('./pbxproj'));
async function configureIos(projectRootPath, config) {
  const validatedConfig = await validators_1.validateIosConfig(config);
  const iosProject = await pbxproj_1.default(projectRootPath);
  await Promise.all([
    Info_plist_1.default(iosProject.projectPath, validatedConfig),
    ImageAsset_1.default(iosProject.projectPath, validatedConfig),
    BackgroundAsset_1.default(iosProject.projectPath, validatedConfig),
    Storyboard_1.default(iosProject, validatedConfig),
  ]);
  await fs_extra_1.default.writeFile(
    iosProject.pbxProject.filepath,
    iosProject.pbxProject.writeSync()
  );
}
exports.default = configureIos;
//# sourceMappingURL=index.js.map
