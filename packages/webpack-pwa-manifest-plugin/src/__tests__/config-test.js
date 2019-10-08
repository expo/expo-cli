import { getConfigForPWA } from '@expo/config';
import { resolve } from 'path';
import { createPWAManifestFromExpoConfig } from '../config';

it(`matches`, async () => {
  // Fill all config values with PWA defaults
  const config = getConfigForPWA(__dirname, (...props) => resolve(__dirname, ...props), {
    templateIcon: require.resolve('./icon.png'),
  });

  const manifest = createPWAManifestFromExpoConfig(config);

  for (const icons of [manifest.icons, manifest.startupImages]) {
    for (const icon of icons) {
      expect(icon.src).toMatch(`webpack-pwa-manifest-plugin/src/__tests__/icon.png`);
      delete icon.src;
    }
  }

  expect(manifest).toMatchSnapshot();
});
