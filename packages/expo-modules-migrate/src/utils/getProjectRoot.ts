import assert from 'assert';
import findUp from 'find-up';
import path from 'path';
import process from 'process';

export function findUpPackageJson(root: string): string {
  const packageJson = findUp.sync('package.json', { cwd: root });
  assert(packageJson, `No package.json found for module "${root}"`);
  return packageJson;
}

export function getProjectRoot(): string {
  return path.dirname(findUpPackageJson(process.cwd()));
}
