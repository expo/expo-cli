import path from 'path';
import readPkg from 'read-pkg';

export function getConfig(cwd: string) {
  return {
    preset: '@expo/jest-preset-cli',
    rootDir: path.resolve(cwd),
    displayName: readPkg.sync({ cwd }).name,
  };
}
