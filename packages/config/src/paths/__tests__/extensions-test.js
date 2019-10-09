import { getManagedExtensions } from '../extensions';

it(`creates extensions for web`, async () => {
  expect(getManagedExtensions('web')).toMatchSnapshot();
});

it(`creates extensions for iOS`, async () => {
  expect(getManagedExtensions('ios', 'native')).toMatchSnapshot();
});
