'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = __importDefault(require('path'));

const validators_1 = require('../validators');
const AndroidManifest_xml_1 = __importDefault(require('./AndroidManifest.xml'));
const Colors_xml_1 = __importDefault(require('./Colors.xml'));
const Drawable_xml_1 = __importDefault(require('./Drawable.xml'));
const Drawables_1 = __importDefault(require('./Drawables'));
const MainActivity_1 = __importDefault(require('./MainActivity'));
const Styles_xml_1 = __importDefault(require('./Styles.xml'));
async function configureAndroid(projectRootPath, configJSON) {
  const validatedConfig = await validators_1.validateAndroidConfig(configJSON);
  const androidMainPath = path_1.default.resolve(projectRootPath, 'android/app/src/main');
  await Promise.all([
    Drawables_1.default(androidMainPath, validatedConfig),
    Colors_xml_1.default(androidMainPath, validatedConfig),
    Drawable_xml_1.default(androidMainPath, validatedConfig),
    Styles_xml_1.default(androidMainPath, validatedConfig),
    AndroidManifest_xml_1.default(androidMainPath),
    MainActivity_1.default(projectRootPath, validatedConfig),
  ]);
}
exports.default = configureAndroid;
//# sourceMappingURL=index.js.map
