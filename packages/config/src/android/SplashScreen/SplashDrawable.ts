import { SplashScreenImageResizeMode } from '../../Config.types';
import { getResourceXMLPathAsync } from '../Paths';
import { writeXMLAsync } from '../XML';
import { SplashScreenConfig } from './SplashConfig';

export async function setSplashDrawableAsync(
  { resizeMode }: Pick<SplashScreenConfig, 'resizeMode'>,
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
            // TODO: Ensure these keys don't get out of sync
            'android:drawable': '@color/splashscreen_background',
          },
        },
        resizeMode === SplashScreenImageResizeMode.NATIVE && {
          bitmap: [
            {
              $: {
                'android:gravity': 'center',
                // TODO: Ensure these keys don't get out of sync
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
