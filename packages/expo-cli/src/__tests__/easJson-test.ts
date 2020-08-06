import fs from 'fs-extra';

import { EasJsonReader } from '../easJson';

jest.mock('fs-extra');

describe('eas.json', () => {
  test('minimal valid android eas.json', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          android: {
            release: { workflow: 'generic' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'android');
    const easJson = await reader.readAsync('release');
    expect({
      builds: {
        android: {
          workflow: 'generic',
          credentialsSource: 'auto',
        },
      },
    }).toEqual(easJson);
  });
  test('minimal valid ios eas.json', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          ios: {
            release: { workflow: 'generic' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'ios');
    const easJson = await reader.readAsync('release');
    expect({
      builds: {
        ios: {
          credentialsSource: 'auto',
          workflow: 'generic',
        },
      },
    }).toEqual(easJson);
  });
  test('minimal valid eas.json for both platforms', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          android: {
            release: { workflow: 'generic' },
          },
          ios: {
            release: { workflow: 'generic' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'all');
    const easJson = await reader.readAsync('release');
    expect({
      builds: {
        android: { workflow: 'generic', credentialsSource: 'auto' },
        ios: { workflow: 'generic', credentialsSource: 'auto' },
      },
    }).toEqual(easJson);
  });
  test('valid eas.json with both platform, but reading only android', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          ios: {
            release: { workflow: 'generic' },
          },
          android: {
            release: { workflow: 'generic' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'android');
    const easJson = await reader.readAsync('release');
    expect({
      builds: {
        android: { workflow: 'generic', credentialsSource: 'auto' },
      },
    }).toEqual(easJson);
  });
  test('valid eas.json for debug builds', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          ios: {
            release: { workflow: 'managed' },
            debug: { workflow: 'managed', buildType: 'simulator' },
          },
          android: {
            release: { workflow: 'generic' },
            debug: {
              workflow: 'generic',
              gradleCommand: ':app:assembleDebug',
              withoutCredentials: true,
            },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'all');
    const easJson = await reader.readAsync('debug');
    expect({
      builds: {
        android: {
          credentialsSource: 'auto',
          workflow: 'generic',
          gradleCommand: ':app:assembleDebug',
          withoutCredentials: true,
        },
        ios: {
          credentialsSource: 'auto',
          workflow: 'managed',
          buildType: 'simulator',
        },
      },
    }).toEqual(easJson);
  });

  test('invalid eas.json with missing preset', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          android: {
            release: { workflow: 'generic' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'android');
    const promise = reader.readAsync('debug');
    expect(promise).rejects.toThrowError('There is no profile named debug for platform android');
  });

  test('invalid eas.json when using buildType for wrong platform', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          android: {
            release: { workflow: 'managed', buildType: 'archive' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'android');
    const promise = reader.readAsync('release');
    expect(promise).rejects.toThrowError(
      'Object "android.release" in eas.json is not valid [ValidationError: "buildType" must be one of [apk, app-bundle]]'
    );
  });

  test('invalid eas.json when missing workflow', async () => {
    fs.readFile.mockImplementationOnce(() =>
      JSON.stringify({
        builds: {
          android: {
            release: { buildType: 'apk' },
          },
        },
      })
    );

    const reader = new EasJsonReader('./fakedir', 'android');
    const promise = reader.readAsync('release');
    expect(promise).rejects.toThrowError(
      'eas.json is not valid [ValidationError: "builds.android.release.workflow" is required]'
    );
  });

  test('empty json', async () => {
    fs.readFile.mockImplementationOnce(() => JSON.stringify({}));

    const reader = new EasJsonReader('./fakedir', 'android');
    const promise = reader.readAsync('release');
    expect(promise).rejects.toThrowError('There is no profile named release for platform android');
  });
});
