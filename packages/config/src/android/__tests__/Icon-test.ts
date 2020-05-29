import { fs, vol } from 'memfs';
import * as path from 'path';
import { createAdaptiveIconXmlString, getAdaptiveIcon, getIcon, setIconAsync } from '../Icon';
import {
  ADAPTIVE_ICON_XML_WITH_BACKGROUND_COLOR,
  ADAPTIVE_ICON_XML_WITH_BOTH,
  LIST_OF_ANDROID_ADAPTIVE_ICON_FILES_FINAL,
  SAMPLE_COLORS_XML,
} from './fixtures/icon';
const actualFs = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

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

describe('Android Icon', () => {
  it(`returns null if no icon values provided`, () => {
    expect(getIcon({})).toBeNull();
    expect(getAdaptiveIcon({})).toMatchObject({
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
    const { foregroundImage, backgroundColor, backgroundImage } = getAdaptiveIcon(config);
    const icon = foregroundImage || getIcon(config);
    expect(icon).toMatch('adaptiveIcon');
    expect(backgroundColor).toMatch('#000000');
    expect(backgroundImage).toMatch('backgroundImage');
  });

  it(`creates the proper AdaptiveIconXmlString`, () => {
    let withBackgroundImage = createAdaptiveIconXmlString(null, 'path/to/image');
    let withBackgroundColor = createAdaptiveIconXmlString('#123456', null);
    let withBoth = createAdaptiveIconXmlString('#123456', 'path/to/image');

    expect(withBackgroundColor).toMatch(ADAPTIVE_ICON_XML_WITH_BACKGROUND_COLOR);
    expect(withBackgroundImage).toMatch(ADAPTIVE_ICON_XML_WITH_BOTH);
    expect(withBoth).toMatch(ADAPTIVE_ICON_XML_WITH_BOTH);
  });

  it('returns null if no icon config provided', async () => {
    expect(await setIconAsync({}, './')).toBe(null);
  });
});

describe('e2e: ONLY android legacy icon', () => {
  const legacyIconPath = path.resolve(__dirname, './fixtures/adaptiveIconForeground.png');
  let legacyIcon: string | Buffer = '';
  const icon = require('../Icon');
  const spyOnSetBackgroundColor = jest.spyOn(icon, 'setBackgroundColor');
  beforeAll(async () => {
    legacyIcon = actualFs.readFileSync(legacyIconPath);
    vol.fromJSON({ './android/app/src/main/res/values/colors.xml': SAMPLE_COLORS_XML }, '/app');
    vol.mkdirpSync('/app/assets');
    vol.writeFileSync('/app/assets/iconForeground.png', legacyIcon);

    await setIconAsync(
      {
        android: {
          icon: '/app/assets/iconForeground.png',
        },
      },
      '/app'
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', () => {
    const after = getDirFromFS(vol.toJSON(), '/app');
    Object.keys(after).forEach(path => {
      expect(LIST_OF_ANDROID_ADAPTIVE_ICON_FILES_FINAL).toContain(path);
    });
  });

  it('Does not set adaptive icon config', () => {
    expect(spyOnSetBackgroundColor).toHaveBeenCalledTimes(0);
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
  let adaptiveIconForeground: string | Buffer = '';
  let adaptiveIconBackground: string | Buffer = '';
  beforeAll(async () => {
    adaptiveIconForeground = actualFs.readFileSync(adaptiveIconForegroundPath);
    adaptiveIconBackground = actualFs.readFileSync(adaptiveIconBackgroundPath);

    vol.fromJSON({ './android/app/src/main/res/values/colors.xml': SAMPLE_COLORS_XML }, '/app');
    vol.mkdirpSync('/app/assets');
    vol.writeFileSync('/app/assets/iconForeground.png', adaptiveIconForeground);
    vol.writeFileSync('/app/assets/iconBackground.png', adaptiveIconBackground);

    await setIconAsync(
      {
        android: {
          adaptiveIcon: {
            foregroundImage: '/app/assets/iconForeground.png',
            backgroundImage: '/app/assets/iconBackground.png',
            backgroundColor: '#123456',
          },
        },
      },
      '/app'
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('writes all the image files expected', () => {
    const after = getDirFromFS(vol.toJSON(), '/app');
    expect(Object.keys(after)).toEqual(LIST_OF_ANDROID_ADAPTIVE_ICON_FILES_FINAL);
  });

  it('writes to colors.xml correctly', () => {
    const after = getDirFromFS(vol.toJSON(), '/app');
    expect(after['android/app/src/main/res/values/colors.xml']).toContain(
      '<color name="iconBackground">#123456</color>'
    );
  });
});
