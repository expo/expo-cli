const path = require('path');
const findWorkspaceRoot = require('find-yarn-workspace-root');
const fs = require('fs');

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

  // react-native init projects do not have a main defined by default
  const { main = 'index' } = require(packageJsonPath);
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
    appMain: absolute(main),
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
