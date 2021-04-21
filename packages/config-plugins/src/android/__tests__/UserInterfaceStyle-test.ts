import { resolve } from 'path';

import { getMainActivity, readAndroidManifestAsync } from '../Manifest';
import {
  addOnConfigurationChangedMainActivity,
  getUserInterfaceStyle,
  ON_CONFIGURATION_CHANGED,
  setUiModeAndroidManifest,
} from '../UserInterfaceStyle';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

const EXAMPLE_MAIN_ACTIVITY_BEFORE = `package com.helloworld;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "HelloWorld";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegate(this, getMainComponentName()) {
            @Override
            protected ReactRootView createRootView() {
                return new RNGestureHandlerEnabledRootView(MainActivity.this);
            }
        };
    }
}
`;

describe('User interface style', () => {
  it(`returns light if no userInterfaceStyle is provided`, () => {
    expect(getUserInterfaceStyle({})).toBe('light');
  });

  it(`returns the userInterfaceStyle if provided`, () => {
    expect(getUserInterfaceStyle({ userInterfaceStyle: 'light' })).toBe('light');
  });

  it(`returns the userInterfaceStyle under android if provided`, () => {
    expect(
      getUserInterfaceStyle({
        userInterfaceStyle: 'dark',
        android: { userInterfaceStyle: 'light' },
      })
    ).toBe('light');
  });

  it(`adds the require imports if needed`, () => {
    const result = addOnConfigurationChangedMainActivity(
      { userInterfaceStyle: 'light' },
      EXAMPLE_MAIN_ACTIVITY_BEFORE
    );

    expect(result.split('\n')[0]).toMatch('package com.helloworld;');
    expect(result).toMatch('import android.content.Intent;');
    expect(result).toMatch('import android.content.res.Configuration');
  });

  it(`adds the onConfigurationChanged method in MainActivity.java if userInterfaceStyle is given`, () => {
    expect(
      addOnConfigurationChangedMainActivity(
        { userInterfaceStyle: 'light' },
        EXAMPLE_MAIN_ACTIVITY_BEFORE
      )
    ).toMatch(ON_CONFIGURATION_CHANGED);
  });

  it(`sets the android:configChanges in AndroidManifest.xml if userInterfaceStyle is given`, async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);

    androidManifestJson = await setUiModeAndroidManifest(
      { userInterfaceStyle: 'light' },
      androidManifestJson
    );

    const mainActivity = getMainActivity(androidManifestJson);
    expect(mainActivity.$['android:configChanges']).toMatch(
      'keyboard|keyboardHidden|orientation|screenSize|uiMode'
    );
  });
});
