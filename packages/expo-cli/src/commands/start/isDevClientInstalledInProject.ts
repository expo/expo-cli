import path from 'path';

const DEV_CLIENT_PACKAGE = 'expo-dev-client';

export default function isDevClientInstalledInProject(projectRoot: string): boolean {
  try {
    const pack = require(path.join(projectRoot, 'package.json'));
    return !!(
      pack.dependencies?.[DEV_CLIENT_PACKAGE] || pack.devDependencies?.[DEV_CLIENT_PACKAGE]
    );
  } catch {
    return false;
  }
}
