import fs from 'fs';
import { vol } from 'memfs';

import { copyFilePathToPathAsync } from '../fs';
jest.mock('fs');

describe(copyFilePathToPathAsync, () => {
  beforeAll(() => {
    jest.spyOn(fs.promises, 'readFile');
    jest.spyOn(fs.promises, 'writeFile');
  });
  afterAll(() => {
    vol.reset();
  });

  it(`copies a single file into a nested location`, async () => {
    const projectRoot = '/';
    const CONTENTS = '{ foobar }';
    vol.fromJSON(
      {
        'google-services.json': CONTENTS,
      },
      projectRoot
    );

    await copyFilePathToPathAsync('/google-services.json', '/android/app/google-services.json');

    expect(fs.promises.readFile).toHaveBeenLastCalledWith('/google-services.json');

    expect(fs.promises.writeFile).toHaveBeenLastCalledWith(
      '/android/app/google-services.json',
      expect.anything()
    );

    expect(vol.toJSON(projectRoot)).toEqual({
      // New
      '/android/app/google-services.json': CONTENTS,
      // Old -- both should still exist
      '/google-services.json': CONTENTS,
    });
  });
});
