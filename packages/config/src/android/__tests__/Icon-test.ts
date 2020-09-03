import { fs, vol } from 'memfs';
import * as path from 'path';

import { ExpoConfig } from '../../Config.types';
import { createAdaptiveIconXmlString, getAdaptiveIcon, getIcon, setIconAsync } from '../Icon';
import {
  ADAPTIVE_ICON_XML_WITH_BACKGROUND_COLOR,
  ADAPTIVE_ICON_XML_WITH_BOTH,
  LIST_OF_ANDROID_ADAPTIVE_ICON_FILES_FINAL,
  SAMPLE_COLORS_XML,
} from './fixtures/icon';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
  compositeImagesAsync({ foreground }) {
    return foreground;
  },
}));

afterAll(() => {
  jest.unmock('@expo/image-utils');
  jest.unmock('fs');
});

function getDirFromFS(fsJSON: Record<string, string | null>, rootDir: string) {
  return Object.entries(fsJSON)
    .filter(([path, value]) => value !== null && path.startsWith(rootDir))
    .reduce<Record<string, string>>(
      (acc, [path, fileContent]) => ({
        ...acc,
        [path.substring(rootDir.length).startsWith('/')
          ? path.substring(rootDir.length + 1)
          : path.substring(rootDir.length)]: fileContent,
      }),
      {}
    );
}

function setUpMipmapDirectories() {
  vol.mkdirpSync('/app/android/app/src/main/res/mipmap-mdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/mipmap-hdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/mipmap-xhdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/mipmap-xxhdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/mipmap-xxxhdpi');
}

describe('Android Icon', () => {
  it(`returns null if no icon values provided`, () => {
    expect(getIcon({} as ExpoConfig)).toBeNull();
    expect(getAdaptiveIcon({} as ExpoConfig)).toMatchObject({
      foregroundImage: null,
      backgroundColor: '#FFFFFF',
      backgroundImage: null,
    });
  });

  it(`returns adaptive icon over android icon`, () => {
    const config = {
      icon: 'icon',
      android: {
        icon: 'androidIcon',
        adaptiveIcon: {
          foregroundImage: 'adaptiveIcon',
          backgroundImage: 'backgroundImage',
          backgroundColor: '#000000',
        },
      },
    };
    const { foregroundImage, backgroundColor, backgroundImage } = getAdaptiveIcon(
      config as ExpoConfig
    );
    const icon = foregroundImage || getIcon(config as ExpoConfig);
    expect(icon).toMatch('adaptiveIcon');
    expect(backgroundColor).toMatch('#000000');
    expect(backgroundImage).toMatch('backgroundImage');
  });

  it(`creates the proper AdaptiveIconXmlString`, () => {
    const withBackgroundImage = createAdaptiveIconXmlString(null, 'path/to/image');
    const withBackgroundColor = createAdaptiveIconXmlString('#123456', null);
    const withBoth = createAdaptiveIconXmlString('#123456', 'path/to/image');

    expect(withBackgroundColor).toMatch(ADAPTIVE_ICON_XML_WITH_BACKGROUND_COLOR);
    expect(withBackgroundImage).toMatch(ADAPTIVE_ICON_XML_WITH_BOTH);
    expect(withBoth).toMatch(ADAPTIVE_ICON_XML_WITH_BOTH);
  });

  it('returns null if no icon config provided', async () => {
    expect(await setIconAsync({} as ExpoConfig, './')).toBe(null);
  });
});

describe('e2e: ONLY android legacy icon', () => {
  const legacyIconPath = path.resolve(__dirname, './fixtures/adaptiveIconForeground.png');
  const projectRoot = '/app';
  const icon = require('../Icon');
  const spyOnConfigureAdaptiveIconAsync = jest.spyOn(icon, 'configureAdaptiveIconAsync');
  beforeAll(async () => {
    const icon = actualFs.readFileSync(legacyIconPath);
    vol.fromJSON(
      { './android/app/src/main/res/values/colors.xml': SAMPLE_COLORS_XML },
      projectRoot
    );
    setUpMipmapDirectories();
    vol.mkdirpSync('/app/assets');
    vol.writeFileSync('/app/assets/iconForeground.png', icon);

    await setIconAsync(
      {
        slug: 'testproject',
        version: '1',
        name: 'testproject',
        platforms: ['ios', 'android'],
        android: {
          icon: '/app/assets/iconForeground.png',
        },
      },
      projectRoot
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', async () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    Object.keys(after).forEach(path => {
      expect(LIST_OF_ANDROID_ADAPTIVE_ICON_FILES_FINAL).toContain(path);
    });
  });

  it('Does not set adaptive icon config', () => {
    expect(spyOnConfigureAdaptiveIconAsync).toHaveBeenCalledTimes(0);
  });
});

describe('e2e: android adaptive icon', () => {
  const adaptiveIconForegroundPath = path.resolve(
    __dirname,
    './fixtures/adaptiveIconForeground.png'
  );
  const adaptiveIconBackgroundPath = path.resolve(
    __dirname,
    './fixtures/adaptiveIconBackground.png'
  );
  const projectRoot = '/app';

  beforeAll(async () => {
    const adaptiveIconForeground = actualFs.readFileSync(adaptiveIconForegroundPath);
    const adaptiveIconBackground = actualFs.readFileSync(adaptiveIconBackgroundPath);

    vol.fromJSON(
      { './android/app/src/main/res/values/colors.xml': SAMPLE_COLORS_XML },
      projectRoot
    );
    setUpMipmapDirectories();
    vol.mkdirpSync('/app/assets');
    vol.writeFileSync('/app/assets/iconForeground.png', adaptiveIconForeground);
    vol.writeFileSync('/app/assets/iconBackground.png', adaptiveIconBackground);

    await setIconAsync(
      {
        slug: 'testproject',
        version: '1',
        name: 'testproject',
        platforms: ['ios', 'android'],
        android: {
          adaptiveIcon: {
            foregroundImage: '/app/assets/iconForeground.png',
            backgroundImage: '/app/assets/iconBackground.png',
            backgroundColor: '#123456',
          },
        },
      },
      projectRoot
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    expect(Object.keys(after)).toEqual(LIST_OF_ANDROID_ADAPTIVE_ICON_FILES_FINAL);
  });

  it('writes to colors.xml correctly', () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    expect(after['android/app/src/main/res/values/colors.xml']).toContain(
      '<color name="iconBackground">#123456</color>'
    );
  });
});
