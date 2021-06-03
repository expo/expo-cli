import { AndroidConfig } from '@expo/config-plugins';
import { vol } from 'memfs';

import {
  setSplashColorsForThemeAsync,
  setSplashStylesForThemeAsync,
} from '../withAndroidSplashStyles';

jest.mock('fs');

export const sampleStylesXML = `
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">#222222</item>
    </style>
</resources>`;

beforeEach(async () => {
  vol.fromJSON(
    {
      './android/app/src/main/res/values/styles.xml': sampleStylesXML,
    },
    '/app'
  );
});

afterEach(async () => {
  vol.reset();
});

it(`sets colors`, async () => {
  const colors = await setSplashColorsForThemeAsync({
    projectRoot: '/app',
    backgroundColor: '#ff0000',
  });

  expect(colors.resources.color?.[0]).toStrictEqual(
    AndroidConfig.Resources.buildResourceItem({
      name: 'splashscreen_background',
      value: '#ff0000',
    })
  );
});

it(`sets styles`, async () => {
  const styles = await setSplashStylesForThemeAsync({
    projectRoot: '/app',
  });

  const parent = {
    name: 'Theme.App.SplashScreen',
    parent: 'Theme.AppCompat.Light.NoActionBar',
  };

  expect(AndroidConfig.Styles.getStyleParent(styles, parent).item[0]).toStrictEqual(
    AndroidConfig.Resources.buildResourceItem({
      name: 'android:windowBackground',
      value: '@drawable/splashscreen',
    })
  );
});
