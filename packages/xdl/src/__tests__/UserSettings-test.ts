import UserSettings from '../UserSettings';

describe(UserSettings.dotExpoHomeDirectory, () => {
  beforeEach(() => {
    delete process.env.__UNSAFE_EXPO_HOME_DIRECTORY;
    delete process.env.EXPO_STAGING;
    delete process.env.EXPO_LOCAL;
    delete process.env.XDG_CONFIG_HOME;
  });

  it(`gets the default state directory`, () => {
    expect(UserSettings.dotExpoHomeDirectory()).toBe('/home/.expo');
  });
  it(`gets the staging state directory`, () => {
    process.env.EXPO_STAGING = 'true';
    expect(UserSettings.dotExpoHomeDirectory()).toBe('/home/.expo-staging');
  });
  it(`gets the local state directory`, () => {
    process.env.EXPO_LOCAL = 'true';
    expect(UserSettings.dotExpoHomeDirectory()).toBe('/home/.expo-local');
  });
  it(`gets the custom state directory`, () => {
    process.env.__UNSAFE_EXPO_HOME_DIRECTORY = '/foobar/yolo';
    expect(UserSettings.dotExpoHomeDirectory()).toBe('/foobar/yolo');
  });
  it(`gets the xdg config home directory`, () => {
    process.env.XDG_CONFIG_HOME = '/foobar/yolo';
    expect(UserSettings.dotExpoHomeDirectory()).toBe('/foobar/yolo/.expo');
  });
});
