const path = require('path');

const findWorkspaceRoot = require('find-yarn-workspace-root');

module.exports = function getLocations(projectRoot) {
  const packageJsonPath = path.resolve(projectRoot, 'package.json');
  const appJsonPath = path.resolve(projectRoot, 'app.json');

  const workspaceRoot = findWorkspaceRoot(projectRoot); // Absolute path or null
  let modulesPath;
  if (workspaceRoot) {
    modulesPath = path.resolve(workspaceRoot, 'node_modules');
  } else {
    modulesPath = path.resolve(projectRoot, 'node_modules');
  }

  const packageJson = require(packageJsonPath);
  const nativeAppManifest = require(appJsonPath);

  const { expo: expoManifest = {} } = nativeAppManifest;
  const { web: expoManifestWebManifest = {} } = expoManifest;

  const favicon = expoManifestWebManifest.favicon
    ? path.resolve(projectRoot, expoManifestWebManifest.favicon)
    : undefined;

  const { productionPath: productionPathFolderName = 'web-build' } = expoManifestWebManifest;

  const productionPath = path.resolve(projectRoot, productionPathFolderName);

  const templatePath = path.resolve(projectRoot, 'web');

  return {
    absolute: (...paths) => path.resolve(projectRoot, ...paths),
    nodeModulesPath: name => path.resolve(modulesPath, name),
    packageJson: packageJsonPath,
    appJson: appJsonPath,
    root: projectRoot,
    appMain: path.resolve(projectRoot, packageJson.main),
    modules: modulesPath,
    template: {
      folder: templatePath,
      indexHtml: path.resolve(templatePath, 'index.html'),
      manifest: path.resolve(templatePath, 'manifest.json'),
      serveJson: path.resolve(templatePath, 'serve.json'),
      favicon,
    },
    production: {
      folder: productionPath,
      indexHtml: path.resolve(productionPath, 'index.html'),
      manifest: path.resolve(productionPath, 'manifest.json'),
      serveJson: path.resolve(productionPath, 'serve.json'),
    },
  };
};
