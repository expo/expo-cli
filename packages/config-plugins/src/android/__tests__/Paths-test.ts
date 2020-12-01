import { vol } from 'memfs';

import {
  getMainActivityAsync,
  getProjectBuildGradleAsync,
  getResourceXMLPathAsync,
  getThemedResourcePathsAsync,
} from '../Paths';

jest.mock('fs');

describe(getMainActivityAsync, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        './android/app/src/main/java/com/bacon/app/MainActivity.java': '...',
      },
      '/app'
    );
    vol.fromJSON(
      {
        './android/app/src/main/java/com/bacon/app/MainActivity.kt': '...',
      },
      '/kt'
    );
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`gets a java project`, async () => {
    const mainActivity = await getMainActivityAsync('/app');
    expect(mainActivity.path).toBe(
      '/app/android/app/src/main/java/com/bacon/app/MainActivity.java'
    );
    expect(mainActivity.language).toBe('java');
    expect(mainActivity.contents).toBe('...');
  });
  it(`gets a kotlin project`, async () => {
    const mainActivity = await getMainActivityAsync('/kt');
    expect(mainActivity.path).toBe('/kt/android/app/src/main/java/com/bacon/app/MainActivity.kt');
    expect(mainActivity.language).toBe('kt');
    expect(mainActivity.contents).toBe('...');
  });
});

describe(getProjectBuildGradleAsync, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        './android/build.gradle': '...',
      },
      '/app'
    );
    vol.fromJSON(
      {
        './android/build.gradle.kts': '...',
      },
      '/kt'
    );
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`gets a groovy gradle`, async () => {
    const file = await getProjectBuildGradleAsync('/app');
    expect(file.path).toBe('/app/android/build.gradle');
    expect(file.language).toBe('groovy');
    expect(file.contents).toBe('...');
  });
  it(`gets a kotlin gradle`, async () => {
    const file = await getProjectBuildGradleAsync('/kt');
    expect(file.path).toBe('/kt/android/build.gradle.kts');
    expect(file.language).toBe('kt');
    expect(file.contents).toBe('...');
  });
});

describe(getResourceXMLPathAsync, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        './android/app/src/main/res/values/colors.xml': '<resources></resources>',
        // './android/app/src/main/res/values-night/colors.xml': '<resources></resources>',
      },
      '/app'
    );
    vol.fromJSON(
      {
        // no files -- specifically no android folder
      },
      '/managed'
    );
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`gets a resource that defaults to values`, async () => {
    const path = await getResourceXMLPathAsync('/app', { name: 'colors' });
    expect(path).toBe('/app/android/app/src/main/res/values/colors.xml');
  });
  it(`gets a themed resource`, async () => {
    const path = await getResourceXMLPathAsync('/app', { name: 'colors', kind: 'values-night' });
    expect(path).toBe('/app/android/app/src/main/res/values-night/colors.xml');
  });

  it(`throws when the android folder is missing`, async () => {
    await expect(getResourceXMLPathAsync('/managed', { name: 'somn' })).rejects.toThrow(
      /Android project folder is missing in project/
    );
  });
});

describe(getThemedResourcePathsAsync, () => {
  beforeAll(async () => {
    vol.fromJSON(
      {
        './android/app/src/main/res/values/colors.xml': '<resources></resources>',
        // Dark mode
        './android/app/src/main/res/values-night/colors.xml': '<resources></resources>',
        // Reserved name
        './android/app/src/main/res/values-main/colors.xml': '<resources></resources>',
      },
      '/app'
    );
    vol.fromJSON(
      {
        './android/app/src/main/res/values/colors.xml': '<resources></resources>',
      },
      '/app-missing-drawables'
    );
    vol.fromJSON(
      {
        // no files -- specifically no android folder
      },
      '/managed'
    );
  });
  afterAll(async () => {
    vol.reset();
  });

  it(`gets a resource set that skips reserved`, async () => {
    const paths = await getThemedResourcePathsAsync('/app', 'values', 'colors');
    expect(paths).toStrictEqual({
      main: '/app/android/app/src/main/res/values/colors.xml',
      night: '/app/android/app/src/main/res/values-night/colors.xml',
    });
  });

  it(`throws when the android folder is missing`, async () => {
    await expect(
      getThemedResourcePathsAsync('/managed', 'drawable', 'splashscreen')
    ).rejects.toThrow(/Android project folder is missing in project/);
  });

  it(`throws when the main drawable is missing`, async () => {
    await expect(
      getThemedResourcePathsAsync('/app-missing-drawables', 'drawable', 'splashscreen')
    ).rejects.toThrow(
      `Project resource default "app/src/main/res/drawable/splashscreen.xml" does not exist in android project for root "/app-missing-drawables`
    );
  });
});
