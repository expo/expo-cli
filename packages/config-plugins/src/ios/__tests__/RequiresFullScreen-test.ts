import { getRequiresFullScreen, setRequiresFullScreen } from '../RequiresFullScreen';

describe('requires full screen', () => {
  it(`returns true if nothing provided`, () => {
    expect(getRequiresFullScreen({ ios: {} })).toBe(true);
  });
  it(`returns false if nothing provided after 43`, () => {
    expect(getRequiresFullScreen({ ios: {}, sdkVersion: '43.0.0' })).toBe(false);
    expect(getRequiresFullScreen({ ios: {}, sdkVersion: 'UNVERSIONED' })).toBe(false);
  });
  it(`asserts invalid SDK version`, () => {
    expect(() => getRequiresFullScreen({ ios: {}, sdkVersion: '43.0' })).toThrow(/version/);
  });

  it(`returns the given value if provided`, () => {
    expect(getRequiresFullScreen({ ios: { requireFullScreen: false } })).toBe(false);
    expect(getRequiresFullScreen({ ios: { requireFullScreen: true } })).toBe(true);
  });

  it(`sets UIRequiresFullScreen value`, () => {
    expect(setRequiresFullScreen({ ios: { requireFullScreen: false } }, {})).toMatchObject({
      UIRequiresFullScreen: false,
    });

    expect(setRequiresFullScreen({}, {})).toMatchObject({
      UIRequiresFullScreen: true,
    });
  });
});
