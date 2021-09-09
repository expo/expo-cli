import path from 'path';

import isDevClientInstalledInProject from '../isDevClientInstalledInProject';

const FIXTURES = path.join(__dirname, 'fixtures');

it('returns false if the dev client package is not installed', () => {
  expect(isDevClientInstalledInProject(path.join(FIXTURES, 'no-dependency'))).toBe(false);
});

it('returns false if the dev client package is not a direct or transitive dependency', () => {
  expect(
    isDevClientInstalledInProject(path.join(FIXTURES, 'no-project-dependency/myproject'))
  ).toBe(false);
});

it('returns true if the dev client package is a direct dependency', () => {
  expect(isDevClientInstalledInProject(path.join(FIXTURES, 'with-dependency'))).toBe(true);
});

it('considers devDependencies too', () => {
  expect(isDevClientInstalledInProject(path.join(FIXTURES, 'with-dev-dependency'))).toBe(true);
});

it('returns true if the dev client package is a transitive dependency', () => {
  expect(isDevClientInstalledInProject(path.join(FIXTURES, 'with-transitive-dependency'))).toBe(
    true
  );
});
