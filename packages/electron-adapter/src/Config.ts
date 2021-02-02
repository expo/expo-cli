import { createForProject } from '@expo/package-manager';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import resolveFrom from 'resolve-from';
// const PACKAGE_MAIN_PROCESS_PATH = '../template/main';
// const PACKAGE_TEMPLATE_PATH = '../../webpack-config/web-default/index.html';
// const PACKAGE_RENDER_WEBPACK_CONFIG_PATH = '../template/webpack.config';
const PACKAGE_MAIN_PROCESS_PATH = '@expo/electron-adapter/template/electron/main';
const PACKAGE_TEMPLATE_PATH = '@expo/webpack-config/web-default/index.html';
const PACKAGE_RENDER_WEBPACK_CONFIG_PATH =
  '@expo/electron-adapter/template/electron/webpack.config';

const LOCAL_ELECTRON_PATH = './electron';
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
  const resolvedFullPath =
    resolveFrom.silent(projectRoot, packagePath) || path.resolve(projectRoot, packagePath);
  return path.relative(projectRoot, resolvedFullPath);
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
  const outputPath = path.resolve(projectPath, LOCAL_ELECTRON_PATH);
  if (!fs.pathExistsSync(outputPath)) {
    fs.ensureDirSync(path.dirname(outputPath));
    fs.copy(path.resolve(__dirname, '../template/electron'), outputPath);
  }
}

export function ensureElectronConfig(projectPath: string) {
  const outputPath = path.resolve(projectPath, 'electron-webpack.js');
  if (!fs.pathExistsSync(outputPath)) {
    fs.copy(path.resolve(__dirname, '../template/electron-webpack.js'), outputPath);
  }
}

export async function ensureMinProjectSetupAsync(projectRoot: string): Promise<void> {
  ensureElectronConfig(projectRoot);
  await ensureGitIgnoreAsync(projectRoot);
  await ensureDependenciesAreInstalledAsync(projectRoot);
}

const generatedTag = `@generated: @expo/electron-adapter@${
  require('@expo/electron-adapter/package.json').version
}`;

function createBashTag(): string {
  return `# ${generatedTag}`;
}

export async function ensureGitIgnoreAsync(projectRoot: string): Promise<void> {
  const destinationPath = path.resolve(projectRoot, '.gitignore');

  // Ensure a default expo .gitignore exists
  if (!(await fs.pathExists(destinationPath))) {
    return;
  }

  // Ensure the .gitignore has the required fields
  let contents = await fs.readFile(destinationPath, 'utf8');

  const tag = createBashTag();
  if (contents.includes(tag)) {
    console.warn(
      chalk.yellow(
        `\u203A The .gitignore already appears to contain expo generated files. To rengerate the code, delete everything from "# ${generatedTag}" to "# @end @expo/electron-adapter" and try again.`
      )
    );
    return;
  }

  console.log(chalk.magenta(`\u203A Adding the generated folders to your .gitignore`));

  const ignore = [
    '',
    tag,
    '/.expo/*',
    '# Expo Web',
    '/web-build/*',
    '# electron-webpack',
    '/dist',
    '# @end @expo/electron-adapter',
    '',
  ];

  contents += ignore.join('\n');
  await fs.writeFile(destinationPath, contents);
}

function getDependencies(
  projectRoot: string
): { dependencies: string[]; devDependencies: string[] } {
  const dependencies = ['react-native-web', 'electron@^6.0.12'].filter(
    dependency => !resolveFrom.silent(projectRoot, dependency.split('@^').shift()!)
  );
  const devDependencies = ['@expo/electron-adapter', '@expo/webpack-config'].filter(
    dependency => !resolveFrom.silent(projectRoot, dependency)
  );

  return { dependencies, devDependencies };
}

async function ensureDependenciesAreInstalledAsync(projectRoot: string): Promise<void> {
  const { dependencies, devDependencies } = getDependencies(projectRoot);
  const all = [...dependencies, ...devDependencies];
  if (!all.length) {
    console.log(chalk.yellow(`\u203A All of the required dependencies are installed already.`));
    return;
  } else {
    console.log(chalk.magenta(`\u203A Installing the missing dependencies: ${all.join(', ')}.`));
  }

  const packageManager = createForProject(projectRoot);

  if (dependencies.length) await packageManager.addAsync(...dependencies);
  if (devDependencies.length) await packageManager.addDevAsync(...devDependencies);
}
