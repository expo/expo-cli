'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const webpack_1 = require('webpack');
const config_1 = require('@expo/config');
const createClientEnvironment_1 = __importDefault(require('../createClientEnvironment'));
/**
 * Required for `expo-constants` https://docs.expo.io/versions/latest/sdk/constants/
 * This surfaces the `app.json` (config) as an environment variable which is then parsed by `expo-constants`.
 */
class ExpoDefinePlugin extends webpack_1.DefinePlugin {
  constructor({ mode, publicUrl, productionManifestPath, config }) {
    const publicAppManifest = config_1.createEnvironmentConstants(config, productionManifestPath);
    const environmentVariables = createClientEnvironment_1.default(
      mode,
      publicUrl,
      publicAppManifest
    );
    super(environmentVariables);
  }
}
exports.default = ExpoDefinePlugin;
//# sourceMappingURL=ExpoDefinePlugin.js.map
