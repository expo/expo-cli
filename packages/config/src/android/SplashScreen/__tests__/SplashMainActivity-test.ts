import { ExpoConfig } from '@expo/config-types';
import fs from 'fs-extra';
import { vol } from 'memfs';

import * as Paths from '../../Paths';
import { setSplashMainActivity } from '../SplashMainActivity';
import fixtures from './fixtures/react-native-project-structure';

jest.mock('fs');

describe(setSplashMainActivity, () => {
  beforeAll(async () => {
    vol.fromJSON(fixtures, '/app');
  });

  afterAll(async () => {
    vol.reset();
  });

  it(`appends code on eject`, async () => {
    const exp: ExpoConfig = {
      slug: '',
      name: '',
      android: {
        splash: {
          resizeMode: 'native',
        },
      },
    };
    const mainActivity = await Paths.getMainActivityAsync('/app');
    let contents = fs.readFileSync(mainActivity.path).toString();
    contents = await setSplashMainActivity(exp, contents, mainActivity.language);
    expect(contents).toMatch(
      /SplashScreen.show\(this, SplashScreenImageResizeMode.NATIVE, false\);/
    );
    // TODO: Support removing the code
    // contents = await setSplashMainActivity(
    //   {
    //     slug: '',
    //     name: '',
    //     android: {
    //       // no splash
    //     },
    //   },
    //   contents,
    //   mainActivity.language
    // );
    // expect(contents).not.toMatch(
    //   /SplashScreen.show\(this, SplashScreenImageResizeMode.NATIVE, false\);/
    // );
  });
});
