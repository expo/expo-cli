const path = require('path');
const findWorkspaceRoot = require('find-yarn-workspace-root');
const fs = require('fs');
const ConfigUtils = require('@expo/config');
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

const appDirectory = fs.realpathSync(process.cwd());

module.exports = async function getPaths({ locations, projectRoot }) {
  // Recycle locations
  if (locations) {
    return locations;
  }
  const inputProjectRoot = projectRoot || appDirectory;

  function absolute(...pathComponents) {
    // Simple check if we are dealing with an URL
    if (pathComponents && pathComponents.length === 1 && pathComponents[0].startsWith('http')) {
      return pathComponents[0];
    }

    return path.resolve(inputProjectRoot, ...pathComponents);
  }

  const absoluteProjectRoot = absolute();

  function findMainFile() {
    for (const fileName of possibleMainFiles) {
      const filePath = absolute(fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  function getModulesPath() {
    const workspaceRoot = findWorkspaceRoot(absoluteProjectRoot); // Absolute path or null
    if (workspaceRoot) {
      return path.resolve(workspaceRoot, 'node_modules');
    } else {
      return absolute('node_modules');
    }
  }

  const { exp: nativeAppManifest, pkg } = await ConfigUtils.readConfigJsonAsync(projectRoot);

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

  const config = ConfigUtils.ensurePWAConfig(nativeAppManifest);

  const productionPath = absolute(config.web.build.output);

  function templatePath(filename = '') {
    const overridePath = absolute('web', filename);
    if (fs.existsSync(overridePath)) {
      return overridePath;
    } else {
      return path.join(__dirname, '../../web-default', filename);
    }
  }

  function getProductionPath(...props) {
    return path.resolve(productionPath, ...props);
  }

  function getIncludeModule(...pathComponents) {
    return path.resolve(modulesPath, ...pathComponents);
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
};
