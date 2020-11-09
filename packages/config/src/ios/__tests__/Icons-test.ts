import * as fs from 'fs-extra';
import { vol } from 'memfs';
import * as path from 'path';

import { getIcons, ICON_CONTENTS, setIconsAsync } from '../Icons';
import { getDirFromFS } from './utils/getDirFromFS';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));

afterAll(() => {
  jest.unmock('@expo/image-utils');
});

describe('iOS Icons', () => {
  it(`returns null if no icon values provided`, () => {
    expect(getIcons({})).toBeNull();
  });

  it(`uses more specific icon`, () => {
    expect(
      getIcons({
        icon: 'icon',
      })
    ).toMatch('icon');
    expect(
      getIcons({
        icon: 'icon',
        ios: {
          icon: 'iosIcon',
        },
      })
    ).toMatch('iosIcon');
  });

  it(`does not support empty string icons`, () => {
    expect(
      getIcons({
        icon: '',
        ios: {
          icon: '',
        },
      })
    ).toBe(null);

    expect(
      getIcons({
        icon: 'icon',
        ios: {
          icon: '',
        },
      })
    ).toMatch('icon');
  });
});

const totalPossibleIcons = ICON_CONTENTS.reduce((prev, curr) => {
  return prev.concat(curr.sizes.reduce((prev, curr) => prev.concat(curr.scales), []));
}, []).length;

describe('e2e: iOS icons', () => {
  const iconPath = path.resolve(__dirname, './fixtures/icons/icon.png');

  const projectRoot = '/app';
  beforeAll(async () => {
    const icon = actualFs.readFileSync(iconPath);

    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': actualFs.readFileSync(
          path.join(__dirname, 'fixtures/project.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.swift': '',
      },
      projectRoot
    );

    vol.mkdirpSync('/app/assets');
    vol.writeFileSync('/app/assets/icon.png', icon);
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', async () => {
    await setIconsAsync(
      {
        slug: 'testproject',
        version: '1',
        name: 'testproject',
        platforms: ['ios', 'android'],
        // must use full path for mock fs
        icon: '/app/assets/icon.png',
      },
      projectRoot
    );

    const after = getDirFromFS(vol.toJSON(), projectRoot);
    const icons = Object.keys(after).filter(value =>
      value.startsWith('ios/testproject/Images.xcassets/AppIcon.appiconset/App-Icon')
    );

    expect(icons.length).toBe(14);
    // Ensure we generate less icons than the possible combos,
    // this is because the Contents.json lets us reuse icons across platforms.
    expect(icons.length).toBeLessThan(totalPossibleIcons);

    // Test the Contents.json file
    const contents = JSON.parse(
      after['ios/testproject/Images.xcassets/AppIcon.appiconset/Contents.json']
    );
    expect(contents.images).toMatchSnapshot();

    // Ensure all icons are assigned as expected.
    expect(contents.images.length).toBe(totalPossibleIcons);
  });
});
