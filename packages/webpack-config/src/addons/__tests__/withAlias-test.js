import withAlias from '../withAlias';
import { DEFAULT_ALIAS } from '../utils/config';

it(`defines default aliases`, () => {
  expect(
    withAlias({
      mode: 'production',
    }).resolve.alias
  ).toStrictEqual(DEFAULT_ALIAS);
});

it(`uses existing aliases over defaults`, () => {
  expect(
    withAlias({
      mode: 'production',
      resolve: { alias: { 'react-native$': 'foobar' } },
    }).resolve.alias['react-native$']
  ).toBe('foobar');
});

it(`allows for custom input aliases`, () => {
  expect(
    withAlias(
      {
        mode: 'production',
        resolve: { alias: { 'react-native$': 'foobar' } },
      },
      { 'react-native$': 'barfoo' }
    ).resolve.alias['react-native$']
  ).toBe('barfoo');
});
