import { realpathSync } from 'fs';
import sudo from 'sudo-prompt';

export type Logger = (...args: any[]) => void;

export interface PackageManager {
  installAsync(): Promise<void>;
  addAsync(...names: string[]): Promise<void>;
  addDevAsync(...names: string[]): Promise<void>;
  versionAsync(): Promise<string>;
  getConfigAsync(key: string): Promise<string>;
  removeLockfileAsync(): Promise<void>;
  cleanAsync(): Promise<void>;
}

export function getPossibleProjectRoot(): string {
  return realpathSync(process.cwd());
}

export function spawnSudoAsync(command: string): Promise<void> {
  const packageJSON = require('../package.json');
  return new Promise((resolve, reject) => {
    sudo.exec(command, { name: packageJSON.name }, error => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
}
