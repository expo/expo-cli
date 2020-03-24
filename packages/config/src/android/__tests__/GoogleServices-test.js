import fs from 'fs-extra';
import { dirname, resolve } from 'path';
import { getGoogleServicesFilePath, setGoogleServicesFile } from '../GoogleServices';

const fixturesPath = resolve(__dirname, 'fixtures');

describe('google services file', () => {
  beforeEach(async () => {
    await fs.remove(resolve(fixturesPath, 'android/app'));
    await fs.remove(resolve(fixturesPath, 'not/'));
  });
  afterAll(async () => {
    await fs.remove(resolve(fixturesPath, 'android/app'));
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
    const projectRoot = fixturesPath;

    expect(
      await setGoogleServicesFile(
        {
          android: {
            googleServicesFile: './google-services.json',
          },
        },
        projectRoot
      )
    ).toBe(true);

    await expect(
      fs.pathExists(resolve(fixturesPath, 'android/app/google-services.json'))
    ).resolves.toBeTruthy();
  });

  it(`copies google services file to custom target path`, async () => {
    const projectRoot = fixturesPath;
    const customTargetPath = './not/sure/why/youd/do/this/google-services.json';
    expect(
      await setGoogleServicesFile(
        {
          android: {
            googleServicesFile: './google-services.json',
          },
        },
        projectRoot,
        customTargetPath
      )
    ).toBe(true);

    await expect(fs.pathExists(resolve(fixturesPath, customTargetPath))).resolves.toBeTruthy();
  });
});
