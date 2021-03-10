import { Formatter } from '@expo/xcpretty';
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

// TODO: Catch JS bundling errors and throw them clearly.
export class ExpoLogFormatter extends Formatter {
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
