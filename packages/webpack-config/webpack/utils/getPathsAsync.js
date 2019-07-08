'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function(resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const path_1 = __importDefault(require('path'));
const find_yarn_workspace_root_1 = __importDefault(require('find-yarn-workspace-root'));
const fs_1 = __importDefault(require('fs'));
const config_1 = __importDefault(require('@expo/config'));
const possibleMainFiles = [
  'index.web.ts',
  'index.ts',
  'index.web.tsx',
  'index.tsx',
  'src/index.web.ts',
  'src/index.ts',
  'src/index.web.tsx',
  'src/index.tsx',
  'index.web.js',
  'index.js',
  'index.web.jsx',
  'index.jsx',
  'src/index.web.js',
  'src/index.js',
  'src/index.web.jsx',
  'src/index.jsx',
];
const appDirectory = fs_1.default.realpathSync(process.cwd());
function getPathsAsync({ locations, projectRoot }) {
  return __awaiter(this, void 0, void 0, function*() {
    // Recycle locations
    if (locations) {
      return locations;
    }
    const inputProjectRoot = projectRoot || appDirectory;
    function absolute(...pathComponents) {
      return path_1.default.resolve(inputProjectRoot, ...pathComponents);
    }
    const absoluteProjectRoot = absolute();
    function findMainFile() {
      for (const fileName of possibleMainFiles) {
        const filePath = absolute(fileName);
        if (fs_1.default.existsSync(filePath)) {
          return filePath;
        }
      }
      return null;
    }
    function getModulesPath() {
      const workspaceRoot = find_yarn_workspace_root_1.default(absoluteProjectRoot); // Absolute path or null
      if (workspaceRoot) {
        return path_1.default.resolve(workspaceRoot, 'node_modules');
      } else {
        return absolute('node_modules');
      }
    }
    const { exp: nativeAppManifest, pkg } = yield config_1.default.readConfigJsonAsync(projectRoot);
    const packageJsonPath = absolute('package.json');
    const modulesPath = getModulesPath();
    /**
     *  The main file is resolved like so:
     * * `app.json` -> `expo.entryPoint`
     * * `package.json` -> `"main"`
     * * `possibleMainFiles`
     */
    let appMain;
    if (nativeAppManifest.entryPoint) {
      appMain = nativeAppManifest.entryPoint;
    } else {
      const { main } = pkg;
      if (!main) {
        // Adds support for create-react-app (src/index.js) and react-native-cli (index.js) which don't define a main.
        appMain = findMainFile();
        if (!appMain) {
          throw new Error(
            'Could not determine the main file in your project (index, src/index). Please define it with the `main` field in your `package.json`'
          );
        }
      } else {
        appMain = main;
      }
    }
    const config = config_1.default.ensurePWAConfig(nativeAppManifest);
    const productionPath = absolute(config.web.build.output);
    function templatePath(filename = '') {
      const overridePath = absolute('web', filename);
      if (fs_1.default.existsSync(overridePath)) {
        return overridePath;
      } else {
        return path_1.default.join(__dirname, '../../web-default', filename);
      }
    }
    function getProductionPath(...props) {
      return path_1.default.resolve(productionPath, ...props);
    }
    function getIncludeModule(...pathComponents) {
      return path_1.default.resolve(modulesPath, ...pathComponents);
    }
    return {
      absolute,
      includeModule: getIncludeModule,
      packageJson: packageJsonPath,
      root: absoluteProjectRoot,
      appMain: absolute(appMain),
      modules: modulesPath,
      template: {
        get: templatePath,
        folder: templatePath(),
        indexHtml: templatePath('index.html'),
        manifest: templatePath('manifest.json'),
        serveJson: templatePath('serve.json'),
        favicon: templatePath('favicon.ico'),
      },
      production: {
        get: getProductionPath,
        folder: getProductionPath(),
        indexHtml: getProductionPath('index.html'),
        manifest: getProductionPath('manifest.json'),
        serveJson: getProductionPath('serve.json'),
        favicon: getProductionPath('favicon.ico'),
      },
    };
  });
}
exports.default = getPathsAsync;
//# sourceMappingURL=getPathsAsync.js.map
