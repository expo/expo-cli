import { printExplanationsAsync } from '../explain';

describe(printExplanationsAsync, () => {
  it(`formats`, async () => {
    await printExplanationsAsync(
      {
        name: '@expo/config-plugins',
        version: '~4.1.4',
      },
      require('./fixtures/invalid-plugins.json')
    );
  });
});
