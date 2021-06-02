import { fs, vol } from 'memfs';

import { readXMLAsync } from '../../utils/XML';
import { readResourcesXMLAsync, ResourceXML } from '../Resources';
import {
  getStatusBarColor,
  getStatusBarStyle,
  setStatusBarColorsForThemeAsync,
  setStatusBarConfig,
  setStatusBarStylesForThemeAsync,
} from '../StatusBar';
import { getProjectStylesXMLPathAsync } from '../Styles';

jest.mock('fs');

export const sampleStylesXML = `
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">#222222</item>
    </style>
</resources>`;

describe(setStatusBarColorsForThemeAsync, () => {
  beforeAll(async () => {
    const directoryJSON = {
      './android/app/src/main/res/values/styles.xml': sampleStylesXML,
    };
    vol.fromJSON(directoryJSON, '/');
  });

  afterAll(async () => {
    vol.reset();
  });

  it(`sets default colors`, async () => {
    await setStatusBarColorsForThemeAsync({
      projectRoot: '/',
      kind: 'values',
      statusBarBackgroundColor: '#ff0000',
    });
    let colors = (await readXMLAsync({
      path: '/android/app/src/main/res/values/colors.xml',
    })) as ResourceXML;

    expect(colors.resources.color[0]).toStrictEqual({
      $: { name: 'colorPrimaryDark' },
      _: '#ff0000',
    });
    expect(colors.resources.color.length).toBe(1);

    // Removes the color
    await setStatusBarColorsForThemeAsync({
      projectRoot: '/',
      kind: 'values',
    });

    colors = (await readXMLAsync({
      path: '/android/app/src/main/res/values/colors.xml',
    })) as ResourceXML;
    // color object is gone...
    expect(colors.resources.color).toBeUndefined();
  });
});
describe(setStatusBarStylesForThemeAsync, () => {
  beforeAll(async () => {
    const directoryJSON = {
      './android/app/src/main/res/values/styles.xml': sampleStylesXML,
    };
    vol.fromJSON(directoryJSON, '/');
  });

  afterAll(async () => {
    vol.reset();
  });

  it(`sets translucent styles`, async () => {
    await setStatusBarStylesForThemeAsync({
      projectRoot: '/',
      kind: 'values',
      hidden: true,
      barStyle: 'dark-content',
      translucent: true,
      // TODO: Make this not default to translucent
      addStatusBarBackgroundColor: false,
    });
    const styles = (await readXMLAsync({
      path: '/android/app/src/main/res/values/styles.xml',
    })) as ResourceXML;

    const parentStyle = styles.resources.style.filter(e => e.$.name === 'Theme.App.SplashScreen')[0]
      .item;
    expect(parentStyle).toBeDefined();

    // translucent = true
    expect(
      parentStyle.filter(item => item.$.name === 'android:windowTranslucentStatus')[0]?._
    ).toBe('true');
    // hidden = true
    expect(parentStyle.filter(item => item.$.name === 'android:windowFullscreen')[0]?._).toBe(
      'true'
    );
    // barStyle = dark-content
    expect(parentStyle.filter(item => item.$.name === 'android:windowLightStatusBar')[0]?._).toBe(
      'true'
    );
  });
  it(`sets opaque styles`, async () => {
    await setStatusBarStylesForThemeAsync({
      projectRoot: '/',
      kind: 'values',
      statusBarBackgroundColor: '#ff0000',
      hidden: false,
      barStyle: 'light-content',
      translucent: false,
      // TODO: Make this not default to translucent
      addStatusBarBackgroundColor: true,
    });
    const styles = (await readXMLAsync({
      path: '/android/app/src/main/res/values/styles.xml',
    })) as ResourceXML;

    const parentStyle = styles.resources.style.filter(e => e.$.name === 'Theme.App.SplashScreen')[0]
      .item;
    expect(parentStyle).toBeDefined();

    // translucent = false
    expect(
      parentStyle.filter(item => item.$.name === 'android:windowTranslucentStatus')[0]?._
    ).toBe('false');
    // hidden = false
    expect(parentStyle.filter(item => item.$.name === 'android:windowFullscreen')[0]?._).toBe(
      'false'
    );
    // barStyle = light-content
    expect(parentStyle.filter(item => item.$.name === 'android:windowLightStatusBar')[0]?._).toBe(
      'false'
    );
    // statusBarBackgroundColor = defined
    expect(parentStyle.filter(item => item.$.name === 'android:statusBarColor')[0]?._).toBe(
      '@color/colorPrimaryDark'
    );
  });
});

describe('Android status bar', () => {
  it(`returns 'translucent' if no status bar color is provided`, () => {
    expect(getStatusBarColor({})).toMatch('translucent');
    expect(getStatusBarColor({ androidStatusBar: {} })).toMatch('translucent');
  });

  it(`returns statusbar color if provided`, () => {
    expect(getStatusBarColor({ androidStatusBar: { backgroundColor: '#111111' } })).toMatch(
      '#111111'
    );
  });

  it(`returns statusbar style if provided`, () => {
    expect(getStatusBarStyle({ androidStatusBar: { barStyle: 'dark-content' } })).toMatch(
      'dark-content'
    );
  });

  it(`default statusbar style to light-content if none provided`, () => {
    expect(getStatusBarStyle({})).toMatch('light-content');
  });

  describe('e2e: write statusbar color and style to files correctly', () => {
    beforeAll(async () => {
      const directoryJSON = {
        './android/app/src/main/res/values/styles.xml': sampleStylesXML,
      };
      vol.fromJSON(directoryJSON, '/app');
    });

    afterAll(async () => {
      vol.reset();
    });

    it(`sets the android:statusBarColor item in styles.xml and adds color to colors.xml if 'androidStatusBar.backgroundColor' is given`, async () => {
      expect(
        await setStatusBarConfig(
          {
            androidStatusBar: {
              backgroundColor: '#654321',
              barStyle: 'dark-content',
              translucent: false,
              hidden: false,
            },
          },
          '/app'
        )
      ).toBe(true);

      const stylesJSON = await readResourcesXMLAsync({
        path: await getProjectStylesXMLPathAsync('/app'),
      });
      const colorsJSON = await readResourcesXMLAsync({
        path: '/app/android/app/src/main/res/values/colors.xml',
      });

      expect(
        stylesJSON.resources.style
          .filter(e => e.$.name === 'Theme.App.SplashScreen')[0]
          .item.filter(item => item.$.name === 'android:statusBarColor')?.[0]?._
      ).toMatch('@color/colorPrimaryDark');

      expect(
        colorsJSON.resources.color.filter(e => e.$.name === 'colorPrimaryDark')?.[0]?._
      ).toMatch('#654321');

      expect(
        stylesJSON.resources.style
          .filter(e => e.$.name === 'Theme.App.SplashScreen')[0]
          .item.filter(item => item.$.name === 'android:windowLightStatusBar')[0]._
      ).toMatch('true');
    });

    it(`sets the status bar to translucent if no 'androidStatusBar.backgroundColor' is given`, async () => {
      expect(await setStatusBarConfig({}, '/app')).toBe(true);
    });
  });
});
