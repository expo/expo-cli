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

  const publicPath = '/DEMO_PATH';
  const { icons: parsedIcons, assets } = await parseIconsAsync(__dirname, icons, publicPath);

  for (const icon of parsedIcons) {
    const { sizes } = icon;
    // Ensure format: 100x200
    expect(sizes.split('x').length).toBe(2);
    // Ensure format: icon_1334x750.png
    expect(icon.src.startsWith(publicPath)).toBe(true);
    expect(icon.src.includes(sizes)).toBe(true);
    expect(icon.src.includes('png')).toBe(true);
    expect(icon.type).toBe('image/png');
  }

  const parsedAssets = assets.map(({ source, ...asset }) => ({ ...asset, source: '<removed>' }));

  expect(parsedAssets).toMatchSnapshot();

  // Ensure the splash props are being used from the app.json splash object
  const startupImages = parsedAssets.filter(({ ios }) => ios && ios.valid === 'startup');

  for (const image of startupImages) {
    expect(image.color).toBe(config.splash.backgroundColor);
    expect(image.resizeMode).toBe(config.splash.resizeMode);
  }
});
