import { vol } from 'memfs';

import { getMainActivityAsync } from '../Paths';

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
