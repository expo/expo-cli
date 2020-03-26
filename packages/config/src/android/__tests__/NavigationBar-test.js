import { fs, vol } from 'memfs';
import {
  getNavigationBarColor,
  getNavigationBarImmersiveMode,
  getNavigationBarStyle,
  setNavigationBarConfig,
} from '../NavigationBar';
import { readStylesXMLAsync } from '../Styles';
import { readColorsXMLAsync } from '../Colors';
import { sampleStylesXML } from './StatusBar-test';
jest.mock('fs');

jest.mock('../../WarningAggregator');
const { addWarningAndroid } = require('../../WarningAggregator');
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
    beforeAll(async () => {
      const directoryJSON = {
        './android/app/src/main/res/values/styles.xml': sampleStylesXML,
      };
      vol.fromJSON(directoryJSON, '/app');
    });

    afterAll(async () => {
      vol.reset();
    });

    it(`sets the navigationBarColor item in styles.xml and adds color to colors.xml if 'androidNavigationBar.backgroundColor' is given. sets windowLightNavigation bar true`, async () => {
      expect(
        await setNavigationBarConfig(
          { androidNavigationBar: { backgroundColor: '#111111', barStyle: 'dark-content' } },
          '/app'
        )
      ).toBe(true);

      let stylesJSON = await readStylesXMLAsync('/app/android/app/src/main/res/values/styles.xml');
      let colorsJSON = await readColorsXMLAsync('/app/android/app/src/main/res/values/colors.xml');

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

    it(`adds android warning androidNavigationBar.visible is provided`, async () => {
      addWarningAndroid.mockImplementationOnce();

      await setNavigationBarConfig({ androidNavigationBar: { visible: 'leanback' } }, '/app');
      expect(addWarningAndroid).toHaveBeenCalledTimes(1);
    });
  });
});
