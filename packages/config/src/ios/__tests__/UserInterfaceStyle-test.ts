import { getUserInterfaceStyle, setUserInterfaceStyle } from '../UserInterfaceStyle';

describe('user interface style', () => {
  it(`returns null if no userInterfaceStyle is provided`, () => {
    expect(getUserInterfaceStyle({})).toBe(null);
  });

  it(`returns the value if provided`, () => {
    expect(getUserInterfaceStyle({ userInterfaceStyle: 'light' })).toBe('light');
  });

  it(`returns the value under the ios key if provided`, () => {
    expect(
      getUserInterfaceStyle({ ios: { userInterfaceStyle: 'light' }, userInterfaceStyle: 'dark' })
    ).toBe('light');
  });

  it(`sets the UIUserInterfaceStyle to the appropriate value if given`, () => {
    expect(setUserInterfaceStyle({ userInterfaceStyle: 'light' }, {})).toMatchObject({
      UIUserInterfaceStyle: 'Light',
    });

    expect(setUserInterfaceStyle({ userInterfaceStyle: 'automatic' }, {})).toMatchObject({
      UIUserInterfaceStyle: 'Automatic',
    });
  });

  it(`makes no changes to the infoPlist if the value is invalid`, () => {
    expect(setUserInterfaceStyle({ userInterfaceStyle: 'not-a-real-one' }, {})).toMatchObject({});
  });
});
