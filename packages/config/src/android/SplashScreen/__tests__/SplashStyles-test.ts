import { vol } from 'memfs';

import { buildResourceItem } from '../../Resources';
import { getStyleParent } from '../../Styles';
import { setSplashColorsForThemeAsync, setSplashStylesForThemeAsync } from '../SplashStyles';

jest.mock('fs');

export const sampleStylesXML = `
<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <!-- Customize your theme here. -->
        <item name="android:windowBackground">#222222</item>
    </style>
</resources>`;

describe('Android status bar', () => {
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
      buildResourceItem({ name: 'splashscreen_background', value: '#ff0000' })
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

    expect(getStyleParent(styles, parent).item[0]).toStrictEqual(
      buildResourceItem({ name: 'android:windowBackground', value: '@drawable/splashscreen' })
    );
  });
});
