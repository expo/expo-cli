import { ensureSlash } from '../paths';

// TODO: Bacon: Add test for resolving entry point
// TODO: Bacon: Add test for custom config paths

describe('ensureSlash', () => {
  it(`ensures the ending slash is added`, () => {
    expect(ensureSlash('', true)).toBe('/');
    expect(ensureSlash('/', true)).toBe('/');
  });
  it(`ensures the ending slash is removed`, () => {
    expect(ensureSlash('', false)).toBe('');
    expect(ensureSlash('/', false)).toBe('');
  });
});
// getAbsolutePathWithProjectRoot;
// getEntryPoint;
