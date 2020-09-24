import { vol } from 'memfs';

import { getMainActivityAsync, getResourceXMLPathAsync } from '../Paths';

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
  });
  it(`gets a kotlin project`, async () => {
    const mainActivity = await getMainActivityAsync('/kt');
    expect(mainActivity.path).toBe('/kt/android/app/src/main/java/com/bacon/app/MainActivity.kt');
    expect(mainActivity.language).toBe('kt');
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
    expect(getResourceXMLPathAsync('/managed', { name: 'somn' })).rejects.toThrow(
      /Android project folder is missing in project/
    );
  });
});
