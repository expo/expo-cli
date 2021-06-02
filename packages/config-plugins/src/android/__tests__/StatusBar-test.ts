import { ExpoConfig } from '@expo/config-types';

import {
  getStatusBarColor,
  getStatusBarStyle,
  setStatusBarColors,
  setStatusBarStyles,
} from '../StatusBar';

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
  it(`sets the colorPrimaryDark item in styles.xml and adds color to colors.xml if 'androidStatusBar.backgroundColor' is given`, async () => {
    const config: ExpoConfig = {
      name: 'foo',
      slug: 'bar',
      androidStatusBar: { backgroundColor: '#654321', barStyle: 'dark-content' },
    };
    const styles = setStatusBarStyles(config, { resources: {} });
    const colors = setStatusBarColors(config, { resources: {} });
    expect(
      styles.resources.style
        .filter(({ $: head }) => head.name === 'AppTheme')[0]
        .item.filter(({ $: head }) => head.name === 'colorPrimaryDark')[0]._
    ).toMatch('@color/colorPrimaryDark');
    expect(
      colors.resources.color.filter(({ $: head }) => head.name === 'colorPrimaryDark')[0]._
    ).toMatch('#654321');
    expect(
      styles.resources.style
        .filter(({ $: head }) => head.name === 'AppTheme')[0]
        .item.filter(({ $: head }) => head.name === 'android:windowLightStatusBar')[0]._
    ).toMatch('true');
  });

  it(`sets the status bar to translucent if no 'androidStatusBar.backgroundColor' is given`, async () => {
    const config: ExpoConfig = {
      name: 'foo',
      slug: 'bar',
      androidStatusBar: {},
    };

    const styles = setStatusBarStyles(config, { resources: {} });
    const colors = setStatusBarColors(config, { resources: {} });

    expect(styles.resources).toStrictEqual({
      style: [
        {
          $: {
            name: 'AppTheme',
            parent: 'Theme.AppCompat.Light.NoActionBar',
          },
          item: [
            {
              $: {
                name: 'android:windowTranslucentStatus',
              },
              _: 'true',
            },
          ],
        },
      ],
    });
    expect(colors.resources).toStrictEqual({});
  });
});
