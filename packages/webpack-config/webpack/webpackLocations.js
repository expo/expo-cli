const path = require('path');
const findWorkspaceRoot = require('find-yarn-workspace-root');
const fs = require('fs');

const possibleMainFiles = [
  'index.web.js',
  'index.js',
  'index.web.jsx',
  'index.jsx',
  'src/index.web.js',
  'src/index.js',
  'src/index.web.jsx',
  'src/index.jsx',
];

function getLocations(inputProjectRoot = '') {
  const absolute = (...pathComponents) =>
    path.resolve(process.cwd(), inputProjectRoot, ...pathComponents);

  const projectRoot = absolute();
  const packageJsonPath = absolute('./package.json');
  const appJsonPath = absolute('./app.json');

  const workspaceRoot = findWorkspaceRoot(projectRoot); // Absolute path or null

  let modulesPath;

  if (workspaceRoot) {
    modulesPath = path.resolve(workspaceRoot, 'node_modules');
  } else {
    modulesPath = absolute('node_modules');
  }

  const { main } = require(packageJsonPath);
  let appMain;
  if (!main) {
    function findMainFile() {
      let exists;
      for (const fileName of possibleMainFiles) {
        const filePath = absolute(fileName);
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }
      return null;
    }

    // Adds support for create-react-app (src/index.js) and react-native-cli (index.js) which don't define a main.
    appMain = findMainFile(possibleMainFiles);
    if (!appMain) {
      throw new Error(
        'Could not determine the main file in your project (index, src/index). Please define it with the `main` field in your `package.json`'
      );
    }
  } else {
    appMain = main;
  }

  const nativeAppManifest = require(appJsonPath);

  const { expo: expoManifest = {} } = nativeAppManifest;
  const { web: expoManifestWebManifest = {} } = expoManifest;

  const favicon = expoManifestWebManifest.favicon
    ? absolute(expoManifestWebManifest.favicon)
    : undefined;

  const { productionPath: productionPathFolderName = 'web-build' } = expoManifestWebManifest;

  const productionPath = absolute(productionPathFolderName);

  const templatePath = (filename = '') => {
    const overridePath = absolute('web', filename);
    if (fs.existsSync(overridePath)) {
      return overridePath;
    } else {
      return path.join(__dirname, '../web-default', filename);
    }
  };

  return {
    absolute,
    includeModule: (...pathComponents) => path.resolve(modulesPath, ...pathComponents),
    packageJson: packageJsonPath,
    appJson: appJsonPath,
    root: projectRoot,
    appMain: absolute(appMain),
    modules: modulesPath,
    template: {
      folder: templatePath(),
      indexHtml: templatePath('index.html'),
      manifest: templatePath('manifest.json'),
      serveJson: templatePath('serve.json'),
      favicon,
    },
    production: {
      folder: productionPath,
      indexHtml: path.resolve(productionPath, 'index.html'),
      manifest: path.resolve(productionPath, 'manifest.json'),
      serveJson: path.resolve(productionPath, 'serve.json'),
    },
  };
}

module.exports = getLocations;
