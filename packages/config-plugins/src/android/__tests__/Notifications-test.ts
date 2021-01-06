import { ExpoConfig } from '@expo/config-types';
import { fs, vol } from 'memfs';
import * as path from 'path';

import { getDirFromFS } from '../../ios/__tests__/utils/getDirFromFS';
import {
  getNotificationColor,
  getNotificationIcon,
  NOTIFICATION_ICON_COLOR,
  setNotificationIconAsync,
  setNotificationIconColorAsync,
} from '../Notifications';
import { SAMPLE_COLORS_XML } from './fixtures/icon';

jest.mock('fs');

const fsReal = jest.requireActual('fs') as typeof fs;

const LIST_OF_GENERATED_NOTIFICATION_FILES = [
  'android/app/src/main/res/drawable-mdpi/notification_icon.png',
  'android/app/src/main/res/drawable-hdpi/notification_icon.png',
  'android/app/src/main/res/drawable-xhdpi/notification_icon.png',
  'android/app/src/main/res/drawable-xxhdpi/notification_icon.png',
  'android/app/src/main/res/drawable-xxxhdpi/notification_icon.png',
  'android/app/src/main/res/values/colors.xml',
  'assets/notificationIcon.png',
];
const iconPath = path.resolve(__dirname, './fixtures/icon.png');
const projectRoot = '/app';

describe('Android notifications configuration', () => {
  beforeAll(async () => {
    const icon = fsReal.readFileSync(iconPath);
    vol.fromJSON(
      { './android/app/src/main/res/values/colors.xml': SAMPLE_COLORS_XML },
      projectRoot
    );
    setUpDrawableDirectories();
    vol.mkdirpSync('/app/assets');
    vol.writeFileSync('/app/assets/notificationIcon.png', icon);

    const expoConfig: ExpoConfig = {
      slug: 'testproject',
      version: '1',
      name: 'testproject',
      platforms: ['ios', 'android'],
      notification: {
        icon: '/app/assets/notificationIcon.png',
        color: '#00ff00',
      },
    };
    await setNotificationIconAsync(expoConfig, projectRoot);
    await setNotificationIconColorAsync(expoConfig, projectRoot);
  });

  afterAll(() => {
    jest.unmock('@expo/image-utils');
    jest.unmock('fs');
    vol.reset();
  });

  it(`returns null if no config provided`, () => {
    expect(getNotificationIcon({} as ExpoConfig)).toBeNull();
    expect(getNotificationColor({} as ExpoConfig)).toBeNull();
  });

  it(`returns config if provided`, () => {
    expect(getNotificationIcon({ notification: { icon: './myIcon.png' } } as ExpoConfig)).toMatch(
      './myIcon.png'
    );
    expect(getNotificationColor({ notification: { color: '#123456' } } as ExpoConfig)).toMatch(
      '#123456'
    );
  });
  it('writes to colors.xml correctly', () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    expect(after['android/app/src/main/res/values/colors.xml']).toContain(
      `<color name="${NOTIFICATION_ICON_COLOR}">#00ff00</color>`
    );
  });
  it('writes all the image files expected', async () => {
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    Object.keys(after).forEach(path => {
      expect(LIST_OF_GENERATED_NOTIFICATION_FILES).toContain(path);
    });
  });
});

function setUpDrawableDirectories() {
  vol.mkdirpSync('/app/android/app/src/main/res/drawable-mdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/drawable-hdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/drawable-xhdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/drawable-xxhdpi');
  vol.mkdirpSync('/app/android/app/src/main/res/drawable-xxxhdpi');
}
