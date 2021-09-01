import { getBuildNumber, getVersion, setBuildNumber, setVersion } from '../Version';

describe('version', () => {
  it(`uses version if it's given in config`, () => {
    expect(getVersion({ version: '1.2.3' })).toBe('1.2.3');
  });

  it(`sets the CFBundleShortVersionString`, () => {
    expect(setVersion({ version: '0.0.1' }, {})).toMatchObject({
      CFBundleShortVersionString: '0.0.1',
    });
  });
});

describe('build number', () => {
  it(`uses ios.buildNumber if it's given in config`, () => {
    expect(getBuildNumber({ ios: { buildNumber: '12' } })).toEqual('12');
  });

  it(`sets the CFBundleVersion`, () => {
    expect(setBuildNumber({ ios: { buildNumber: '21' } }, {})).toMatchObject({
      CFBundleVersion: '21',
    });
  });
});
