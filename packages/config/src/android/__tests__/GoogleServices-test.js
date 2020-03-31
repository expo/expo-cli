import fs from 'fs-extra';
import { resolve } from 'path';
import { getGoogleServicesFilePath, setGoogleServicesFile } from '../GoogleServices';

jest.mock('fs-extra');
const fixturesPath = resolve(__dirname, 'fixtures');

describe('google services file', () => {
  afterAll(async () => {
    await fs.remove(resolve(fixturesPath, 'not/'));
  });

  it(`returns null if no googleServicesFile is provided`, () => {
    expect(getGoogleServicesFilePath({}, fixturesPath)).toBe(null);
  });

  it(`returns googleServicesFile path if provided`, () => {
    expect(
      getGoogleServicesFilePath(
        {
          android: {
            googleServicesFile: 'path/to/google-services.json',
          },
        },
        fixturesPath
      )
    ).toBe('path/to/google-services.json');
  });

  it(`copies google services file to android/app`, async () => {
    expect(
      await setGoogleServicesFile(
        {
          android: {
            googleServicesFile: './google-services.json',
          },
        },
        fixturesPath
      )
    ).toBe(true);

    expect(fs.copy).toHaveBeenCalledWith(
      resolve(fixturesPath, 'google-services.json'),
      resolve(fixturesPath, 'android/app/google-services.json')
    );
  });

  it(`copies google services file to custom target path`, async () => {
    const customTargetPath = './not/sure/why/youd/do/this/google-services.json';
    expect(
      await setGoogleServicesFile(
        {
          android: {
            googleServicesFile: './google-services.json',
          },
        },
        fixturesPath,
        customTargetPath
      )
    ).toBe(true);

    expect(fs.copy).toHaveBeenCalledWith(
      resolve(fixturesPath, 'google-services.json'),
      resolve(fixturesPath, customTargetPath)
    );
  });
});
