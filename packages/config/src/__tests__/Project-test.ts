import { getNativeBuildVersion, getRuntimeVersionNullable } from '../Project';

describe(getNativeBuildVersion, () => {
  const version = '1.0.0';
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
  it('throws an error if the version is missing', () => {
    expect(() => {
      getNativeBuildVersion({}, 'ios');
    }).toThrow('Missing "version" field');
  });
  it('throws an error if the platform is ios and the buildNumber is missing', () => {
    expect(() => {
      getNativeBuildVersion({ version }, 'ios');
    }).toThrow(
      'The "ios.buildNumber" field is required when computing the native build version for ios.'
    );
  });
  it('throws an error if the platform is android and the  versionCode is missing', () => {
    expect(() => {
      getNativeBuildVersion({ version }, 'android');
    }).toThrow(
      'The "android.versionCode" field is required when computing the native build version for android.'
    );
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
