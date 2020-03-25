import withAlias from '../withAlias';

it(`defines default aliases`, () => {
  expect(
    withAlias(
      {
        mode: 'production',
      },
      { foo: 'bar' }
    ).resolve.alias
  ).toStrictEqual({ foo: 'bar' });
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
