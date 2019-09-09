import { getConfigForPWA } from '@expo/config';
import { resolve } from 'path';
import { parseIconsAsync, retrieveIcons } from '../icons';

import { createPWAManifestFromExpoConfig } from '../config';

it(`matches`, async () => {
  // Fill all config values with PWA defaults
  const config = getConfigForPWA(__dirname, (...props) => resolve(__dirname, ...props), {
    templateIcon: require.resolve('./icon.png'),
  });

  const manifest = createPWAManifestFromExpoConfig(config);

  const [icons] = retrieveIcons(manifest);

  const { icons: parsedIcons, assets } = await parseIconsAsync(icons, false, '/DEMO_PATH');

  expect(parsedIcons).toMatchSnapshot();
  expect(
    assets.map(({ source, ...asset }) => ({ ...asset, source: '<removed>' }))
  ).toMatchSnapshot();
});
