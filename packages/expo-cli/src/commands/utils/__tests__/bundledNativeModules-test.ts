import { UserManager } from '@expo/api';
import { vol } from 'memfs';
import path from 'path';

import { getBundledNativeModulesAsync } from '../bundledNativeModules';

jest.mock('fs');

describe(getBundledNativeModulesAsync, () => {
  const projectRoot = '/test-project';

  beforeEach(() => {
    UserManager.clientForUser = jest.fn();
    (UserManager.clientForUser as jest.Mock).mockImplementation(() => {
      throw new Error('Should not be called');
    });
    vol.reset();
  });

  it('gets the bundled native modules from api', async () => {
    vol.fromJSON({
      [path.join(projectRoot, 'node_modules/expo/bundledNativeModules.json')]: JSON.stringify({
        'expo-abc': '~1.2.3',
        'expo-def': '~0.1.2',
      }),
    });
    (UserManager.clientForUser as jest.Mock).mockImplementation(() => ({
      getAsync: () => [
        { npmPackage: 'expo-abc', versionRange: '~1.3.3' },
        { npmPackage: 'expo-def', versionRange: '~0.2.2' },
      ],
    }));

    const bundledNativeModules = await getBundledNativeModulesAsync(projectRoot, '66.0.0');
    expect(UserManager.clientForUser).toHaveBeenCalledTimes(1);
    expect(bundledNativeModules).toEqual({
      'expo-abc': '~1.3.3',
      'expo-def': '~0.2.2',
    });
  });

  it('returns the cached bundled native modules if api is down', async () => {
    vol.fromJSON({
      [path.join(projectRoot, 'node_modules/expo/bundledNativeModules.json')]: JSON.stringify({
        'expo-abc': '~1.2.3',
        'expo-def': '~0.1.2',
      }),
    });
    (UserManager.clientForUser as jest.Mock).mockImplementation(() => ({
      getAsync: () => {
        throw new Error('api is down');
      },
    }));

    const bundledNativeModules = await getBundledNativeModulesAsync(projectRoot, '66.0.0');
    expect(UserManager.clientForUser).toHaveBeenCalledTimes(1);
    expect(bundledNativeModules).toEqual({
      'expo-abc': '~1.2.3',
      'expo-def': '~0.1.2',
    });
  });

  it('throws an error if api is down and expo is not installed', async () => {
    (UserManager.clientForUser as jest.Mock).mockImplementation(() => ({
      getAsync: () => {
        throw new Error('api is down');
      },
    }));

    await expect(getBundledNativeModulesAsync(projectRoot, '66.0.0')).rejects.toThrowError();
  });
});
