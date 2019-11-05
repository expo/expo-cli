import { getModuleFileExtensions } from '../extensions';

it(`creates extensions for web`, async () => {
  expect(getModuleFileExtensions('web')).toMatchSnapshot();
});

it(`creates extensions for iOS`, async () => {
  expect(getModuleFileExtensions('ios', 'native')).toMatchSnapshot();
});
