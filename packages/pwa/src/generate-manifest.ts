import { createPWAManifestFromConfig, getConfigForPWA, setCustomConfigPath } from '@expo/config';
import { getAbsolutePathWithProjectRoot } from '@expo/config/paths';
// @ts-ignore: no types found
import pwaManifest from '@pwa/manifest';

import generateMeta from './generate-html';

export async function generateManifestAsync(options: {
  src: string;
  dest: string;
  publicPath: string;
}): Promise<string[]> {
  const projectRoot = process.cwd();
  setCustomConfigPath(projectRoot, options.src);
  const expoConfig = getConfigForPWA(
    projectRoot,
    (...pathComponents) => getAbsolutePathWithProjectRoot(projectRoot, ...pathComponents),
    // @ts-ignore
    {}
  );

  const writtenManifest = pwaManifest.sync({
    // Convert the Expo config into a PWA manifest
    ...createPWAManifestFromConfig(expoConfig),
    // Allow for overrides
    // ...manifest,
  });

  // Write manifest
  pwaManifest.writeSync(options.dest, writtenManifest);

  return [generateMeta.manifest({ href: 'manifest.json' })];
}
