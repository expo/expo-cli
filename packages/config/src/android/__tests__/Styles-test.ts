import { vol } from 'memfs';

import { readXMLAsync } from '../Manifest';
import {
  buildItem,
  getProjectStylesXMLPathAsync,
  getStyleParent,
  setStylesItem,
  writeStylesXMLAsync,
} from '../Styles';
jest.mock('fs');

const mockStyles = `
<?xml
  version="1.0"
  encoding="UTF-8"
  standalone="yes"
?>
<resources>
  <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:textColor">#000000</item>
    <item name="android:windowTranslucentStatus">true</item>
    <item name="colorPrimary">@color/colorPrimary</item>
  </style>
  <style name="Theme.App.SplashScreen" parent="Theme.AppCompat.Light.NoActionBar">
    <item name="android:windowBackground">@drawable/splashscreen</item>
  </style>
</resources>`;

describe('Styles', () => {
  beforeAll(async () => {
    const directoryJSON = {
      './app/android/app/src/main/res/values/styles.xml': mockStyles,
      './empty/android/app/src/main/res/values/styles.xml': '<resources></resources>',
    };
    vol.fromJSON(directoryJSON, '/');
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`sets a style on an empty resource item`, async () => {
    const stylesPath = await getProjectStylesXMLPathAsync('/empty')!;
    const xml = await readXMLAsync({ path: stylesPath });
    const parent = { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' };
    setStylesItem({
      xml,
      parent,
      item: [buildItem({ name: 'android:textColor', value: '#fff000' })],
    });
    await writeStylesXMLAsync({ path: stylesPath, xml });

    const modifiedXml = await readXMLAsync({ path: stylesPath });

    expect(getStyleParent(modifiedXml, parent)).toStrictEqual({
      $: { name: 'AppTheme', parent: 'Theme.AppCompat.Light.NoActionBar' },
      item: [{ $: { name: 'android:textColor' }, _: '#fff000' }],
    });
  });
  it(`changes the value of a style`, async () => {
    const stylesPath = await getProjectStylesXMLPathAsync('/app')!;
    const xml = await readXMLAsync({ path: stylesPath });
    const parent = { name: 'Theme.App.SplashScreen', parent: 'Theme.AppCompat.Light.NoActionBar' };
    setStylesItem({
      xml,
      parent,
      item: [buildItem({ name: 'android:textColor', value: '#ffffff' })],
    });
    await writeStylesXMLAsync({ path: stylesPath, xml });

    const modifiedXml = await readXMLAsync({ path: stylesPath });

    expect(getStyleParent(modifiedXml, parent)).toStrictEqual({
      $: { name: 'Theme.App.SplashScreen', parent: 'Theme.AppCompat.Light.NoActionBar' },
      item: [
        { $: { name: 'android:windowBackground' }, _: '@drawable/splashscreen' },
        {
          $: {
            name: 'android:textColor',
          },
          _: '#ffffff',
        },
      ],
    });
  });
});
