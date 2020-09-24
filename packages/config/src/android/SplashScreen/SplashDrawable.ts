import { AndroidSplashScreenConfig } from '@expo/configure-splash-screen';

import { SplashScreenImageResizeMode } from '../../Config.types';
import { getResourceXMLPathAsync } from '../Paths';
import { writeXMLAsync } from '../XML';

export async function setSplashDrawableAsync(
  { imageResizeMode: resizeMode }: Pick<AndroidSplashScreenConfig, 'imageResizeMode'>,
  projectRoot: string
) {
  const filePath = (await getResourceXMLPathAsync(projectRoot, {
    name: 'splashscreen',
    kind: 'drawable',
  }))!;

  // Nuke and rewrite the splashscreen.xml drawable
  const xmlContent = {
    'layer-list': {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
      },
      item: [
        {
          $: {
            'android:drawable': '@color/splashscreen_background',
          },
        },
        resizeMode === SplashScreenImageResizeMode.NATIVE && {
          bitmap: [
            {
              $: {
                'android:gravity': 'center',
                'android:src': '@drawable/splashscreen_image',
              },
            },
          ],
        },
      ].filter(Boolean),
    },
  };
  await writeXMLAsync({ path: filePath, xml: xmlContent });
}
