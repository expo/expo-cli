export function isDevClientPackageInstalled(projectRoot: string) {
  try {
    // we check if `expo-dev-launcher` is installed instead of `expo-dev-client`
    // because someone could install only launcher.
    require.resolve('expo-dev-launcher', { paths: [projectRoot] });
    return true;
  } catch (e) {
    return false;
  }
}
