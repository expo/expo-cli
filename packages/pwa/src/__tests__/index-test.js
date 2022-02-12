import path from 'path';

import { joinUrlPath } from '../index';

describe('joinUrlPath', () => {
  const publicPath = 'https://test.draftbit.app';
  const filePath = 'index.html';

  describe(`joins urls with URL`, () => {
    it(`simple`, () => {
      const got = joinUrlPath(publicPath, filePath);
      expect(got).toBe('https://test.draftbit.app/index.html');
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

    beforeEach(spy.mockClear);
    afterAll(spy.mockRestore);

    it(`simple`, () => {
      const got = joinUrlPath('/pwa', filePath);
      expect(got).toBe(`${path.sep}pwa${path.sep}index.html`);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it(`empty segment`, () => {
      const got = joinUrlPath('', filePath);
      expect(got).toBe('index.html');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it(`raw segment`, () => {
      const got = joinUrlPath('pwa', filePath);
      expect(got).toBe(`pwa${path.sep}index.html`);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it(`separator`, () => {
      const got = joinUrlPath('/', filePath);
      expect(got).toBe(`${path.sep}index.html`);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it(`many segments`, () => {
      const got = joinUrlPath('/', '', 'one', '/two', 'three/', filePath);
      expect(got).toBe(`${path.sep}one${path.sep}two${path.sep}three${path.sep}index.html`);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
