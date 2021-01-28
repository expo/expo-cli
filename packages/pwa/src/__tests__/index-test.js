import path from 'path';

import { joinUrlPath } from '../index';

const publicPath = 'https://test.draftbit.app';
const filePath = 'index.html';

describe('joinUrlPath', () => {
  describe(`joins urls with URL`, () => {
    it(`simple`, () => {
      const got = joinUrlPath(publicPath, filePath);
      expect(got).toBe('https://test.draftbit.app/index.html');
      expect(got).not.toBe('https:/test.draftbit.app/index.html');
    });

    it(`empty segment`, () => {
      const got = joinUrlPath(publicPath, '', filePath);
      expect(got).toBe('https://test.draftbit.app/index.html');
    });

    it(`raw segment`, () => {
      const got = joinUrlPath(publicPath, 'divider', filePath);
      expect(got).toBe('https://test.draftbit.app/divider/index.html');
    });

    it(`separator`, () => {
      const got = joinUrlPath(publicPath, '/', filePath);
      expect(got).toBe('https://test.draftbit.app/index.html');
    });

    it(`many segments`, () => {
      const got = joinUrlPath(publicPath, '/divider', '', 'one', '/', filePath);
      expect(got).toBe('https://test.draftbit.app/divider/one/index.html');
    });
  });

  describe(`joins non-urls with path.join`, () => {
    const spy = jest.spyOn(path, 'join');

    it(`simple`, () => {
      const got = joinUrlPath('/pwa', filePath);
      expect(got).toBe('/pwa/index.html');
      expect(spy).toHaveBeenCalled();
    });

    it(`empty segment`, () => {
      const got = joinUrlPath('', filePath);
      expect(got).toBe('index.html');
      expect(spy).toHaveBeenCalled();
    });

    it(`raw segment`, () => {
      const got = joinUrlPath('pwa', filePath);
      expect(got).toBe('pwa/index.html');
      expect(spy).toHaveBeenCalled();
    });

    it(`separator`, () => {
      const got = joinUrlPath('/', filePath);
      expect(got).toBe('/index.html');
      expect(spy).toHaveBeenCalled();
    });

    it(`many segments`, () => {
      const got = joinUrlPath('/', '', 'one', '/two', 'three/', filePath);
      expect(got).toBe('/one/two/three/index.html');
      expect(spy).toHaveBeenCalled();
    });
  });
});
