import { WarningAggregator } from '@expo/config-plugins';

import { createPlugin } from '../expo-branch';

jest.mock('@expo/config-plugins', () => {
  const plugins = jest.requireActual('@expo/config-plugins');
  return {
    ...plugins,
    WarningAggregator: { addWarningForPlatform: jest.fn() },
  };
});

for (const platform of ['android', 'ios']) {
  it(`warns when deprecated branch features are use`, async () => {
    // @ts-ignore: jest
    WarningAggregator.addWarningForPlatform.mockImplementationOnce();
    // @ts-ignore: jest
    createPlugin(platform)({
      name: '',
      slug: '',
      [platform]: { config: { branch: { apiKey: 'xxx' } } },
    });
    expect(WarningAggregator.addWarningForPlatform).toHaveBeenLastCalledWith(
      platform,
      platform + '.config.branch.apiKey',
      'expo-branch has been deprecated in favor of react-native-branch. Please install react-native-branch in your project and setup the Expo config plugin.'
    );
  });
}
