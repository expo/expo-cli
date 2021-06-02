import { getColorsAsObject } from '../Colors';
import {
  getNavigationBarColor,
  getNavigationBarImmersiveMode,
  getNavigationBarStyle,
  setNavigationBarColors,
  setNavigationBarStyles,
  withNavigationBar,
} from '../NavigationBar';
import { getAppThemeLightNoActionBarGroup, getStylesGroupAsObject } from '../Styles';

jest.mock('../../utils/warnings');

const { addWarningAndroid } = require('../../utils/warnings');

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
    it(`sets the navigationBarColor item in styles.xml. sets windowLightNavigation bar true`, async () => {
      const stylesJSON = await setNavigationBarStyles(
        { androidNavigationBar: { backgroundColor: '#111111', barStyle: 'dark-content' } },
        { resources: {} }
      );

      const group = getStylesGroupAsObject(stylesJSON, getAppThemeLightNoActionBarGroup());
      expect(group['android:navigationBarColor']).toBe('@color/navigationBarColor');
      expect(group['android:windowLightNavigationBar']).toBe('true');
    });

    it(`sets the navigationBarColor item in styles.xml and adds color to colors.xml if 'androidNavigationBar.backgroundColor' is given. sets windowLightNavigation bar true`, async () => {
      const colorsJSON = await setNavigationBarColors(
        { androidNavigationBar: { backgroundColor: '#111111', barStyle: 'dark-content' } },
        { resources: {} }
      );

      expect(getColorsAsObject(colorsJSON).navigationBarColor).toBe('#111111');
    });

    it(`adds android warning androidNavigationBar.visible is provided`, async () => {
      addWarningAndroid.mockImplementationOnce();
      withNavigationBar({ androidNavigationBar: { visible: 'leanback' } } as any);
      expect(addWarningAndroid).toHaveBeenCalledTimes(1);
    });
  });
});
