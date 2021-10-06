import { getNativeVersion, getRuntimeVersion, getUpdateUrl } from '../Updates';

console.warn = jest.fn();

describe(getUpdateUrl, () => {
  it(`returns correct default values from all getters if no value provided.`, () => {
    const url = 'https://u.expo.dev/00000000-0000-0000-0000-000000000000';
    expect(getUpdateUrl({ updates: { url }, slug: 'foo' }, 'user')).toBe(url);
  });

  it(`returns null if neither 'updates.url' or 'user' is supplied.`, () => {
    expect(getUpdateUrl({ slug: 'foo' }, null)).toBe(null);
  });

  it(`returns correct legacy urls if 'updates.url' is not provided, but 'slug' and ('username'|'owner') are provided.`, () => {
    expect(getUpdateUrl({ slug: 'my-app' }, 'user')).toBe('https://exp.host/@user/my-app');
    expect(getUpdateUrl({ slug: 'my-app', owner: 'owner' }, 'user')).toBe(
      'https://exp.host/@owner/my-app'
    );
    expect(getUpdateUrl({ slug: 'my-app', owner: 'owner' }, null)).toBe(
      'https://exp.host/@owner/my-app'
    );
  });
});

describe(getNativeVersion, () => {
  const version = '2.0.0';
  const versionCode = 42;
  const buildNumber = '13';
  it('works for android', () => {
    expect(getNativeVersion({ version, android: { versionCode } }, 'android')).toBe(
      `${version}(${versionCode})`
    );
  });
  it('works for ios', () => {
    expect(getNativeVersion({ version, ios: { buildNumber } }, 'ios')).toBe(
      `${version}(${buildNumber})`
    );
  });
  it('throws an error if platform is not recognized', () => {
    const fakePlatform = 'doesnotexist';
    expect(() => {
      getNativeVersion({ version }, fakePlatform as any);
    }).toThrow(`"${fakePlatform}" is not a supported platform. Choose either "ios" or "android".`);
  });
  it('uses the default version if the version is missing', () => {
    expect(getNativeVersion({}, 'ios')).toBe('1.0.0(1)');
  });
  it('uses the default buildNumber if the platform is ios and the buildNumber is missing', () => {
    expect(getNativeVersion({ version }, 'ios')).toBe(`${version}(1)`);
  });
  it('uses the default versionCode if the platform is android and the versionCode is missing', () => {
    expect(getNativeVersion({ version }, 'android')).toBe(`${version}(1)`);
  });
});

describe(getRuntimeVersion, () => {
  it('works if the top level runtimeVersion is a string', () => {
    const runtimeVersion = '42';
    expect(getRuntimeVersion({ runtimeVersion }, 'ios')).toBe(runtimeVersion);
  });
  it('works if the platform specific runtimeVersion is a string', () => {
    const runtimeVersion = '42';
    expect(getRuntimeVersion({ ios: { runtimeVersion } }, 'ios')).toBe(runtimeVersion);
  });
  it('works if the runtimeVersion is a policy', () => {
    const version = '1';
    const buildNumber = '2';
    expect(
      getRuntimeVersion(
        { version, runtimeVersion: { policy: 'nativeBuildVersion' }, ios: { buildNumber } },
        'ios'
      )
    ).toBe(`${version}(${buildNumber})`);
  });
  it('throws no runtime version is supplied', () => {
    expect(() => {
      getRuntimeVersion({}, 'ios');
    }).toThrow(`There is neither a value or a policy set for the runtime version on "ios"`);
  });
  it('throws if runtime version is not parseable', () => {
    expect(() => {
      getRuntimeVersion({ runtimeVersion: 1 } as any, 'ios');
    }).toThrow(
      `"1" is not a valid runtime version. getRuntimeVersion only supports a string, "sdkVersion", or "nativeVersion" policy.`
    );
    expect(() => {
      getRuntimeVersion({ runtimeVersion: { policy: 'unsupportedPlugin' } } as any, 'ios');
    }).toThrow(
      `"{"policy":"unsupportedPlugin"}" is not a valid runtime version. getRuntimeVersion only supports a string, "sdkVersion", or "nativeVersion" policy.`
    );
  });
});
