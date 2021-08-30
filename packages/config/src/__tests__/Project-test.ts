import {
  getBuildNumber,
  getNativeBuildVersion,
  getRuntimeVersionNullable,
  getVersion,
  getVersionCode,
} from '../Project';

console.warn = jest.fn();

describe(getNativeBuildVersion, () => {
  const version = '2.0.0';
  const versionCode = 42;
  const buildNumber = '13';
  it('works for android', () => {
    expect(getNativeBuildVersion({ version, android: { versionCode } }, 'android')).toBe(
      `${version}(${versionCode})`
    );
  });
  it('works for ios', () => {
    expect(getNativeBuildVersion({ version, ios: { buildNumber } }, 'ios')).toBe(
      `${version}(${buildNumber})`
    );
  });
  it('throws an error if platform is not recognized', () => {
    const fakePlatform = 'doesnotexit';
    expect(() => {
      getNativeBuildVersion({ version }, fakePlatform as any);
    }).toThrow(`"${fakePlatform}" is not a supported platform. Choose either "ios" or "android".`);
  });
  it('uses the default version if the version is missing', () => {
    expect(getNativeBuildVersion({}, 'ios')).toBe('1.0.0(1)');
  });
  it('uses the default buildNumber if the platform is ios and the buildNumber is missing', () => {
    expect(getNativeBuildVersion({ version }, 'ios')).toBe(`${version}(1)`);
  });
  it('uses the default versionCode if the platform is android and the versionCode is missing', () => {
    expect(getNativeBuildVersion({ version }, 'android')).toBe(`${version}(1)`);
  });
});

describe(getVersion, () => {
  it(`uses version if it's given in config`, () => {
    expect(getVersion({ version: '1.2.3' })).toBe('1.2.3');
  });

  it(`uses 1.0.0 if no version is given`, () => {
    expect(getVersion({})).toBe('1.0.0');
  });
});
describe(getVersionCode, () => {
  it(`returns 1 if no version code is provided`, () => {
    expect(getVersionCode({})).toBe(1);
  });

  it(`returns the version code if provided`, () => {
    expect(getVersionCode({ android: { versionCode: 5 } })).toBe(5);
  });
});
describe(getBuildNumber, () => {
  it(`uses ios.buildNumber if it's given in config`, () => {
    expect(getBuildNumber({ ios: { buildNumber: '12' } })).toEqual('12');
  });

  it(`falls back to '1' if not provided`, () => {
    expect(getBuildNumber({ ios: { buildNumber: null } })).toEqual('1');
    expect(getBuildNumber({})).toEqual('1');
  });
});
describe(getRuntimeVersionNullable, () => {
  it('works if the top level runtimeVersion is a string', () => {
    const runtimeVersion = '42';
    expect(getRuntimeVersionNullable({ runtimeVersion }, 'ios')).toBe(runtimeVersion);
  });
  it('works if the platform specific runtimeVersion is a string', () => {
    const runtimeVersion = '42';
    expect(getRuntimeVersionNullable({ ios: { runtimeVersion } }, 'ios')).toBe(runtimeVersion);
  });
  it('works if the runtimeVersion is a policy', () => {
    const version = '1';
    const buildNumber = '2';
    expect(
      getRuntimeVersionNullable(
        { version, runtimeVersion: { policy: 'nativeBuildVersion' }, ios: { buildNumber } },
        'ios'
      )
    ).toBe(`${version}(${buildNumber})`);
  });
  it('returns null if no runtime version is found', () => {
    expect(getRuntimeVersionNullable({}, 'ios')).toBe(null);
  });
  it('works if no platform is specified', () => {
    const runtimeVersion = '42';
    expect(getRuntimeVersionNullable({ runtimeVersion })).toBe(runtimeVersion);
  });
  it('throws if no platform is specified while using a policy ', () => {
    expect(() => {
      getRuntimeVersionNullable({ runtimeVersion: { policy: 'nativeBuildVersion' } });
    }).toThrow('You must specify a platform while using a policy');
  });
  it('throws if runtime version is not parseable', () => {
    expect(() => {
      getRuntimeVersionNullable({ runtimeVersion: 1 } as any, 'ios');
    }).toThrow(
      `"1" is not a valid runtime version. getRuntimeVersion only supports a string or the "nativeBuildVersion" policy.`
    );
    expect(() => {
      getRuntimeVersionNullable({ runtimeVersion: { policy: 'unsupportedPlugin' } } as any, 'ios');
    }).toThrow(
      `"{"policy":"unsupportedPlugin"}" is not a valid runtime version. getRuntimeVersion only supports a string or the "nativeBuildVersion" policy.`
    );
  });
});
