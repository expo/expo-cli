import { Formatter, Parser } from '@expo/xcpretty';
import { switchRegex } from '@expo/xcpretty/build/switchRegex';
import chalk from 'chalk';

import Log from '../../../log';

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

const ERROR = '❌ ';

class ErrorCollectionFormatter extends Formatter {
  // Count the errors
  public errors: string[] = [];

  formatCompileError(
    fileName: string,
    filePathAndLocation: string,
    reason: string,
    line: string,
    cursor: string
  ): string {
    const results = super.formatCompileError(fileName, filePathAndLocation, reason, line, cursor);
    this.errors.push(results);
    return results;
  }

  formatError(message: string): string {
    const results = super.formatError(message);
    this.errors.push(results);
    return results;
  }

  formatFileMissingError(reason: string, filePath: string): string {
    const results = super.formatFileMissingError(reason, filePath);
    this.errors.push(results);
    return results;
  }
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

export class ExpoLogFormatter extends ErrorCollectionFormatter {
  constructor(props: { projectRoot: string }) {
    super(props);
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
    if (Log.isDebug) return true;
    return !filePath.match(/node_modules/) && !filePath.match(/\/ios\/Pods\//);
  }

  formatCompile(fileName: string, filePath: string): string {
    const moduleName = getNodeModuleName(filePath);
    const moduleNameTag = moduleName ? chalk.dim(`(${moduleName})`) : undefined;
    return ['\u203A', 'Compiling', fileName, moduleNameTag].filter(Boolean).join(' ');
  }
}
