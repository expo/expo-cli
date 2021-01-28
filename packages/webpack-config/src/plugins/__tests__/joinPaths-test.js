import path from 'path';

import { joinPublicPath } from '../PwaManifestWebpackPlugin';

const publicPath = 'https://test.draftbit.app';
const filePath = 'index.html';
const want = 'https://test.draftbit.app/index.html';
const bad = 'https:/test.draftbit.app/index.html';

it(`the old way generates bad url protocols`, () => {
  const got = path.join(publicPath, filePath);
  expect(got).toBe(bad);
});

it(`joins full url publicPath`, () => {
  const got = joinPublicPath(publicPath, filePath);
  expect(got).toBe(want);
  expect(got).not.toBe(bad);
});

const spy = jest.spyOn(path, 'join');

it(`joins non-urls with path.join`, () => {
  const got = joinPublicPath('/pwa', filePath);
  expect(got).toBe('/pwa/index.html');
  expect(spy).toHaveBeenCalled();
});
