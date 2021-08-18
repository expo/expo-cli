import { vol } from 'memfs';
import * as path from 'path';

import { downloadAppArchiveAsync, extractLocalArchiveAsync } from '../files';

jest.mock('fs');
const originalFs = jest.requireActual('fs');

jest.mock('got', () => {
  return {
    stream() {
      return {
        on() {
          const fs = require('fs');
          return fs.createReadStream('/apk-archive.tar.gz');
        },
      };
    },
  };
});
jest.mock('temp-dir', () => '/tmp');
jest.mock('../files', () => {
  const filesModule = jest.requireActual('../files');
  return {
    ...filesModule,
    createDownloadStream() {
      const fs = require('fs');
      const path = require('path');
      return fs.createReadStream(path.resolve('fixtures/apk-archive.tar.gz'));
    },
  };
});

beforeAll(async () => {
  vol.mkdirpSync('/tmp');
  vol.writeFileSync(
    '/apk-archive.tar.gz',
    originalFs.readFileSync(path.join(__dirname, 'fixtures/apk-archive.tar.gz'))
  );
});
afterAll(() => {
  vol.reset();
});

describe('downloadAppArchiveAsync', () => {
  it(`downloads an apk to a file with the same name in a temporary directory`, async () => {
    const path = await downloadAppArchiveAsync('http://fake.expo.dev/app.apk');
    expect(path).toMatch(/app.apk$/);
  });
  it(`downloads and extracts a tar to a file with the correct extension in a temporary directory`, async () => {
    const path = await downloadAppArchiveAsync('http://fake.expo.dev/app.tar.gz');
    expect(path).toMatch(/app.tar.gz.apk$/);
  });
});

describe('extractLocalArchiveAsync', () => {
  it(`returns the input path if the file is not a tar`, async () => {
    expect(await extractLocalArchiveAsync('/App.apk')).toBe('/App.apk');
  });
  it(`returns a temporary file from an extracted tar`, async () => {
    expect(await extractLocalArchiveAsync('/apk-archive.tar.gz')).toMatch(
      /apk-archive.tar.gz.apk$/
    );
  });
});
