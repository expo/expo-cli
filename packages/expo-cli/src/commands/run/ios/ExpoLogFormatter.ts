import { FileOperation, Formatter, Parser } from '@expo/xcpretty';
import { switchRegex } from '@expo/xcpretty/build/switchRegex';
import chalk from 'chalk';
import findUp from 'find-up';
import path from 'path';

import Log from '../../../log';

const ERROR = '❌ ';

const cachedPackages: Record<string, any> = {};

function packageJsonForPath(filePath: string): any {
  const packageJson = findUp.sync('package.json', { cwd: filePath });
  if (packageJson) {
    return require(packageJson);
  }
  return null;
}

function moduleNameFromPath(modulePath: string) {
  if (modulePath.startsWith('@')) {
    const [org, packageName] = modulePath.split('/');
    if (org && packageName) {
      return [org, packageName].join('/');
    }
    return modulePath;
  }
  const [packageName] = modulePath.split('/');
  return packageName ? packageName : modulePath;
}

function getNodeModuleName(filePath: string): string | null {
  // '/Users/evanbacon/Documents/GitHub/lab/yolo5/node_modules/react-native-reanimated/ios/Nodes/REACallFuncNode.m'
  const [, modulePath] = filePath.split('/node_modules/');
  if (modulePath) {
    return moduleNameFromPath(modulePath);
  }
  return null;
}

class CustomParser extends Parser {
  private isCollectingMetroError = false;
  private metroError: string[] = [];

  constructor(public formatter: ExpoLogFormatter) {
    super(formatter);
  }

  parse(text: string): void | string {
    const results = this.checkMetroError(text);
    if (results) {
      return results;
    }
    return super.parse(text);
  }

  // Error for the build script wrapper in expo-updates that catches metro bundler errors.
  // This can be repro'd by importing a file that doesn't exist, then building.
  // Metro will fail to generate the JS bundle, and throw an error that should be caught here.
  checkMetroError(text: string) {
    // In expo-updates, we wrap the bundler script and add regex around the error message so we can present it nicely to the user.
    return switchRegex(text, [
      [
        /@build-script-error-begin/m,
        () => {
          this.isCollectingMetroError = true;
        },
      ],
      [
        /@build-script-error-end/m,
        () => {
          const results = this.metroError.join('\n');
          // Reset the metro collection error array (should never need this).
          this.isCollectingMetroError = false;
          this.metroError = [];
          return this.formatter.formatMetroAssetCollectionError(results);
        },
      ],
      [
        null,
        () => {
          // Collect all the lines in the metro build error
          if (this.isCollectingMetroError) {
            let results = text;
            if (!this.metroError.length) {
              const match = text.match(
                /Error loading assets JSON from Metro.*steps correctly.((.|\n)*)/m
              );
              if (match && match[1]) {
                results = match[1].trim();
              }
            }
            this.metroError.push(results);
          }
        },
      ],
    ]);
  }
}

type CustomProps = {
  projectRoot: string;
  podfile: Record<string, Record<string, string>>;
  appName: string;
};

export class ExpoLogFormatter extends Formatter {
  private nativeProjectRoot: string;

  constructor(public props: CustomProps) {
    super(props);
    this.nativeProjectRoot = path.join(props.projectRoot, 'ios');
    this.parser = new CustomParser(this);
  }

  formatMetroAssetCollectionError(errorContents: string): string {
    const results = `\n${chalk.red(
      ERROR +
        // Provide proper attribution.
        'Metro encountered an error:\n' +
        errorContents
    )}\n`;
    this.errors.push(results);
    return results;
  }

  shouldShowCompileWarning(filePath: string, lineNumber?: string, columnNumber?: string): boolean {
    if (Log.isDebug) {
      return true;
    }
    return !filePath.match(/node_modules/) && !filePath.match(/\/ios\/Pods\//);
  }

  getFileOperationTitle(type: FileOperation['type']): string {
    switch (type) {
      case 'Analyze':
        return 'Analyzing';
      case 'GenerateDSYMFile':
        return `Generating debug`;
      case 'Ld':
        return 'Linking';
      case 'Libtool':
        return 'Building lib';
      case 'ProcessPCH':
        return 'Precompiling';
      case 'ProcessInfoPlistFile':
        return 'Processing';
      case 'CodeSign':
        return 'Signing';
      case 'Touch':
        return 'Creating';
      case 'CompileC':
      case 'CompileSwift':
      case 'CompileXIB':
      case 'CompileStoryboard':
        return 'Compiling';
      default:
        // Unknown file operation
        return '';
    }
  }

  formatFileOperation(props: FileOperation): string {
    const title = this.getFileOperationTitle(props.type);
    const moduleNameTag = this.getPkgName(props.filePath, props.target);
    return Formatter.format(
      title,
      [moduleNameTag, Formatter.formatBreadCrumb(props.fileName, props.target, props.project)]
        .filter(Boolean)
        .join(' ')
    );
  }

  formatPhaseScriptExecution(scriptName: string, target?: string, project?: string): string {
    const moduleNameTag = this.getPkgName('', target);

    return Formatter.format(
      'Running script',
      [moduleNameTag, Formatter.formatBreadCrumb(scriptName, target, project)]
        .filter(Boolean)
        .join(' ')
    );
  }

  private getPkgName(filePath: string, target?: string): string | null {
    let moduleName = getNodeModuleName(filePath);
    if (!moduleName) {
      if (target === this.props.appName || target === `Pods-${this.props.appName}`) {
        moduleName = '';
      } else if (target && target in knownPackages) {
        moduleName = knownPackages[target];
      } else {
        const pkg = this.packageJsonForProject(target);
        if (pkg) {
          moduleName = pkg.name;
        }
      }
    }
    return moduleName ? chalk.cyan(`${moduleName}`) : null;
  }

  private packageJsonForProject(project?: string): any {
    if (!project) {
      return null;
    }

    if (project in cachedPackages) {
      return cachedPackages[project];
    }

    const filePath = Object.values(this.props.podfile[project] || {})[0] ?? null;
    if (!filePath) {
      return null;
    }

    const pkg = packageJsonForPath(path.join(this.nativeProjectRoot, filePath as string));
    if (pkg) {
      cachedPackages[project] = pkg;
    }
    return pkg ?? null;
  }

  finish() {
    Log.log(`\n\u203A ${this.errors.length} error(s), and ${this.warnings.length} warning(s)\n`);
  }
}

// A list of packages that aren't linked through cocoapods directly.
const knownPackages: Record<string, string> = {
  // Added to ReactCore as a `resource_bundle`
  'React-Core-AccessibilityResources': 'react-native',
  YogaKit: 'react-native',
  // flipper
  'Flipper-DoubleConversion': 'react-native',
  'Flipper-Folly': 'react-native',
  'OpenSSL-Universal': 'react-native',
  FlipperKit: 'react-native',
  Flipper: 'react-native',
  'Flipper-RSocket': 'react-native',
};
