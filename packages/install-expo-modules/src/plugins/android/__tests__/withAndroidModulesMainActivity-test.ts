import { setModulesMainActivity } from '../withAndroidModulesMainActivity';

describe(setModulesMainActivity, () => {
  it(`should add createReactActivityDelegate code block if not overridden yet - java`, () => {
    const rawContents = `
package com.helloworld;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }
}`;

    const expectContents = `
package com.helloworld;
import expo.modules.ReactActivityDelegateWrapper;
import com.facebook.react.ReactActivityDelegate;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegateWrapper(this,
      new ReactActivityDelegate(this, getMainComponentName())
    );
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'java');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'java');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add createReactActivityDelegate code block if not overridden yet - kotlin`, () => {
    const rawContents = `
package com.helloworld

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }
}`;

    const expectContents = `
package com.helloworld
import expo.modules.ReactActivityDelegateWrapper
import com.facebook.react.ReactActivityDelegate

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(this,
      ReactActivityDelegate(this, getMainComponentName())
    );
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'kt');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'kt');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add ReactActivityDelegateWrapper for react-native@>=0.68.0 - java`, () => {
    const rawContents = `
package com.helloworld;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new MainActivityDelegate(this, getMainComponentName());
  }

  public static class MainActivityDelegate extends ReactActivityDelegate {
    public MainActivityDelegate(ReactActivity activity, String mainComponentName) {
      super(activity, mainComponentName);
    }

    @Override
    protected ReactRootView createRootView() {
      ReactRootView reactRootView = new ReactRootView(getContext());
      // If you opted-in for the New Architecture, we enable the Fabric Renderer.
      reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED);
      return reactRootView;
    }
  }
}`;

    const expectContents = `
package com.helloworld;
import expo.modules.ReactActivityDelegateWrapper;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegateWrapper(this, new MainActivityDelegate(this, getMainComponentName()));
  }

  public static class MainActivityDelegate extends ReactActivityDelegate {
    public MainActivityDelegate(ReactActivity activity, String mainComponentName) {
      super(activity, mainComponentName);
    }

    @Override
    protected ReactRootView createRootView() {
      ReactRootView reactRootView = new ReactRootView(getContext());
      // If you opted-in for the New Architecture, we enable the Fabric Renderer.
      reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED);
      return reactRootView;
    }
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'java');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'java');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add ReactActivityDelegateWrapper for react-native@>=0.68.0 - kotlin`, () => {
    const rawContents = `
package com.helloworld

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return MainActivityDelegate(this, mainComponentName)
  }

  class MainActivityDelegate(activity: ReactActivity?, mainComponentName: String?)
    : ReactActivityDelegate(activity, mainComponentName) {
    override fun createRootView(): ReactRootView {
      val reactRootView = ReactRootView(context)
      // If you opted-in for the New Architecture, we enable the Fabric Renderer.
      reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)
      return reactRootView
    }
  }
}`;

    const expectContents = `
package com.helloworld
import expo.modules.ReactActivityDelegateWrapper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(this, MainActivityDelegate(this, mainComponentName))
  }

  class MainActivityDelegate(activity: ReactActivity?, mainComponentName: String?)
    : ReactActivityDelegate(activity, mainComponentName) {
    override fun createRootView(): ReactRootView {
      val reactRootView = ReactRootView(context)
      // If you opted-in for the New Architecture, we enable the Fabric Renderer.
      reactRootView.setIsFabric(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)
      return reactRootView
    }
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'kt');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'kt');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add ReactActivityDelegateWrapper for react-native@<0.68.0 - java`, () => {
    const rawContents = `
package com.helloworld;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegate(this, getMainComponentName());
  }
}`;

    const expectContents = `
package com.helloworld;
import expo.modules.ReactActivityDelegateWrapper;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegateWrapper(this, new ReactActivityDelegate(this, getMainComponentName()));
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'java');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'java');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add ReactActivityDelegateWrapper for react-native@<0.68.0 - kotlin`, () => {
    const rawContents = `
package com.helloworld

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegate(this, mainComponentName)
  }
}`;

    const expectContents = `
package com.helloworld
import expo.modules.ReactActivityDelegateWrapper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(this, ReactActivityDelegate(this, mainComponentName))
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'kt');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'kt');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add ReactActivityDelegateWrapper for anonymous class - java`, () => {
    const rawContents = `
package com.helloworld;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
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
}`;

    const expectContents = `
package com.helloworld;
import expo.modules.ReactActivityDelegateWrapper;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "HelloWorld";
  }

  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegateWrapper(this, new ReactActivityDelegate(this, getMainComponentName()) {
      @Override
      protected ReactRootView createRootView() {
        return new RNGestureHandlerEnabledRootView(MainActivity.this);
      }
    });
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'java');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'java');
    expect(nextContents).toEqual(expectContents);
  });

  it(`should add ReactActivityDelegateWrapper for anonymous class - kotlin`, () => {
    const rawContents = `
package com.helloworld

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return object : ReactActivityDelegate(this, mainComponentName) {
      override fun createRootView(): ReactRootView {
        return RNGestureHandlerEnabledRootView(this@MainActivity)
      }
    }
  }
}`;

    const expectContents = `
package com.helloworld
import expo.modules.ReactActivityDelegateWrapper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun mainComponentName: String {
    return "HelloWorld"
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(this, object : ReactActivityDelegate(this, mainComponentName) {
      override fun createRootView(): ReactRootView {
        return RNGestureHandlerEnabledRootView(this@MainActivity)
      }
    })
  }
}`;

    const contents = setModulesMainActivity(rawContents, 'kt');
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = setModulesMainActivity(contents, 'kt');
    expect(nextContents).toEqual(expectContents);
  });
});
