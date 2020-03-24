import fs from 'fs-extra';
import { dirname, resolve } from 'path';
import {
  getNavigationBarColor,
  getNavigationBarImmersiveMode,
  getNavigationBarStyle,
  setNavigationBarConfig,
} from '../NavigationBar';
import { readStylesXMLAsync } from '../Styles';
import { getProjectColorsXMLPathAsync, readColorsXMLAsync } from '../Colors';
const fixturesPath = resolve(__dirname, 'fixtures');
const sampleStylesXMLPath = resolve(fixturesPath, 'styles.xml');

describe('Android navigation bar', () => {
  it(`returns 'translucent' if no status bar color is provided`, () => {
    expect(getNavigationBarColor({})).toBe(null);
    expect(getNavigationBarColor({ androidNavigationBar: {} })).toBe(null);
  });

  it(`returns navigation bar color if provided`, () => {
    expect(getNavigationBarColor({ androidNavigationBar: { backgroundColor: '#111111' } })).toMatch(
      '#111111'
    );
  });

  it(`returns navigation bar style if provided`, () => {
    expect(getNavigationBarStyle({ androidNavigationBar: { barStyle: 'dark-content' } })).toMatch(
      'dark-content'
    );
  });

  it(`default navigation bar style to light-content if none provided`, () => {
    expect(getNavigationBarStyle({})).toMatch('light-content');
  });

  it(`return navigation bar visible if present`, () => {
    expect(
      getNavigationBarImmersiveMode({ androidNavigationBar: { visible: 'leanback' } })
    ).toMatch('leanback');
  });

  it(`default navigation bar visible to null`, () => {
    expect(getNavigationBarImmersiveMode({})).toBe(null);
  });

  describe('e2e: write navigation color and style to files correctly', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const stylesXMLPath = resolve(fixturesPath, 'tmp/android/app/src/main/res/values/styles.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(stylesXMLPath));
      await fs.copyFile(sampleStylesXMLPath, stylesXMLPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it(`sets the navigationBarColor item in styles.xml and adds color to colors.xml if 'androidNavigationBar.backgroundColor' is given. sets windowLightNavigation bar true`, async () => {
      expect(
        await setNavigationBarConfig(
          { androidNavigationBar: { backgroundColor: '#111111', barStyle: 'dark-content' } },
          projectDirectory
        )
      ).toBe(true);

      let stylesJSON = await readStylesXMLAsync(stylesXMLPath);
      let colorsXMLPath = await getProjectColorsXMLPathAsync(projectDirectory);
      let colorsJSON = await readColorsXMLAsync(colorsXMLPath);
      expect(
        stylesJSON.resources.style
          .filter(e => e['$']['name'] === 'AppTheme')[0]
          .item.filter(item => item['$'].name === 'android:navigationBarColor')[0]['_']
      ).toMatch('@color/navigationBarColor');
      expect(
        colorsJSON.resources.color.filter(e => e['$']['name'] === 'navigationBarColor')[0]['_']
      ).toMatch('#111111');
      expect(
        stylesJSON.resources.style
          .filter(e => e['$']['name'] === 'AppTheme')[0]
          .item.filter(item => item['$'].name === 'android:windowLightNavigationBar')[0]['_']
      ).toMatch('true');
    });

    it(`logs to console if androidNavigationBar.visible is provided`, async () => {
      console.log = jest.fn();

      await setNavigationBarConfig(
        { androidNavigationBar: { visible: 'leanback' } },
        projectDirectory
      );
      expect(console.log).toHaveBeenCalledWith(
        'Hiding the Android navigation bar must be done programatically. Please see the Android documentation: https://developer.android.com/training/system-ui/immersive'
      );
    });
  });
});
