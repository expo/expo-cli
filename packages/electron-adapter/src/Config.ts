import * as path from 'path';
import fs from 'fs-extra';
import resolveFrom from 'resolve-from';

// const PACKAGE_MAIN_PROCESS_PATH = '../template/main';
// const PACKAGE_TEMPLATE_PATH = '../../webpack-config/web-default/index.html';
// const PACKAGE_RENDER_WEBPACK_CONFIG_PATH = '../template/webpack.config';
const PACKAGE_MAIN_PROCESS_PATH = '@expo/electron-adapter/template/main';
const PACKAGE_TEMPLATE_PATH = '@expo/webpack-config/web-default/index.html';
const PACKAGE_RENDER_WEBPACK_CONFIG_PATH = '@expo/electron-adapter/template/webpack.config';

const LOCAL_MAIN_PROCESS_PATH = './electron/main';
const LOCAL_TEMPLATE_PATH = './electron/template/index.html';
const LOCAL_RENDER_WEBPACK_CONFIG_PATH = './electron/webpack.config';

function getFolder(projectRoot: string, localPath: string, packagePath: string): string {
  const resolvedFullPath =
    resolveFrom.silent(projectRoot, localPath) || resolveFrom.silent(projectRoot, packagePath);

  if (!resolvedFullPath) throw new Error(`Failed to resolve path for file: ${packagePath}`);
  return path.relative(projectRoot, path.dirname(resolvedFullPath));
}

function getFile(projectRoot: string, localPath: string, packagePath: string): string {
  const localTemplate = path.join(projectRoot, localPath);
  if (fs.pathExistsSync(localTemplate)) {
    return localTemplate;
  }
  return path.relative(projectRoot, path.resolve(projectRoot, packagePath));
}

function resolveFile(projectRoot: string, localPath: string, packagePath: string): string {
  const localTemplate = resolveFrom.silent(projectRoot, localPath);
  if (localTemplate) {
    return path.relative(projectRoot, localTemplate);
  }
  return path.relative(projectRoot, resolveFrom(projectRoot, packagePath));
}

export function withExpoAdapter({
  projectRoot,
  ...config
}: {
  projectRoot?: string;
  [key: string]: any;
}): { [key: string]: any } {
  projectRoot = projectRoot || fs.realpathSync(process.cwd());

  const webpackConfig = resolveFile(
    projectRoot,
    LOCAL_RENDER_WEBPACK_CONFIG_PATH,
    PACKAGE_RENDER_WEBPACK_CONFIG_PATH
  );

  const mainSourceDirectory = getFolder(
    projectRoot,
    LOCAL_MAIN_PROCESS_PATH,
    PACKAGE_MAIN_PROCESS_PATH
  );

  return {
    commonSourceDirectory: './electron/common',
    staticSourceDirectory: './electron/static',
    ...config,
    main: {
      sourceDirectory: mainSourceDirectory,
      ...((config || {}).main || {}),
    },
    renderer: {
      sourceDirectory: './',
      template: getFile(projectRoot, LOCAL_TEMPLATE_PATH, PACKAGE_TEMPLATE_PATH),
      webpackConfig,
      ...((config || {}).renderer || {}),
    },
  };
}

export function copyTemplateToProject(projectPath: string) {
  const outputPath = path.resolve(projectPath, LOCAL_MAIN_PROCESS_PATH);
  if (!fs.pathExistsSync(outputPath)) {
    fs.ensureDirSync(path.dirname(outputPath));
    fs.copy(path.resolve(__dirname, '../template'), outputPath);
  }
}
