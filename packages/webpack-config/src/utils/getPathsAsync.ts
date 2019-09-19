import * as ConfigUtils from '@expo/config';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { FilePaths } from '../types';

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

function ensureSlash(inputPath: string, needsSlash: boolean): string {
  const hasSlash = inputPath.endsWith('/');
  if (hasSlash && !needsSlash) {
    return inputPath.substr(0, inputPath.length - 1);
  } else if (!hasSlash && needsSlash) {
    return `${inputPath}/`;
  } else {
    return inputPath;
  }
}

export default async function getPathsAsync({
  locations,
  projectRoot,
}: {
  projectRoot?: string;
  locations?: FilePaths;
} = {}): Promise<FilePaths> {
  // Recycle locations
  if (locations) {
    return locations;
  }

  const envPublicUrl = process.env.WEB_PUBLIC_URL;
  const appDirectory = fs.realpathSync(process.cwd());

  const inputProjectRoot = projectRoot || appDirectory;

  function absolute(...pathComponents: string[]) {
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

  const { exp: nativeAppManifest, pkg } = await ConfigUtils.readConfigJsonAsync(inputProjectRoot);

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

  const getPublicUrl = (appPackageJson: string) => envPublicUrl || require(appPackageJson).homepage;
  // We use `WEB_PUBLIC_URL` environment variable or "homepage" field to infer
  // "public path" at which the app is served.
  // Webpack needs to know it to put the right <script> hrefs into HTML even in
  // single-page apps that may serve index.html for nested URLs like /todos/42.
  // We can't use a relative path in HTML because we don't want to load something
  // like /todos/42/static/js/bundle.7289d.js. We have to know the root.
  function getServedPath(appPackageJson: string): string {
    const publicUrl = getPublicUrl(appPackageJson);
    const servedUrl = envPublicUrl || (publicUrl ? url.parse(publicUrl).pathname : '/');
    return ensureSlash(servedUrl!, true);
  }

  const config = ConfigUtils.ensurePWAConfig(nativeAppManifest, absolute, {
    templateIcon: templatePath('icon.png'),
  });

  const productionPath = absolute(config.web.build.output);

  function templatePath(filename: string = ''): string {
    const overridePath = absolute('web', filename);
    if (fs.existsSync(overridePath)) {
      return overridePath;
    }
    return path.join(__dirname, '../../web-default', filename);
  }

  function getProductionPath(...props: string[]): string {
    return path.resolve(productionPath, ...props);
  }

  function getIncludeModule(...props: string[]): string {
    return path.resolve(modulesPath, ...props);
  }

  return {
    absolute,
    includeModule: getIncludeModule,
    packageJson: packageJsonPath,
    root: absoluteProjectRoot,
    appMain: absolute(appMain),
    modules: modulesPath,
    servedPath: getServedPath(absolute('package.json')),
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
}
