import path from 'path';
import getPathsAsync from '../getPathsAsync';
import normalizePaths from '../normalizePaths';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');
const projectRootCustomHomepage = path.resolve(__dirname, '../../../tests/custom-homepage');

function defaultNormalize(locations) {
  return normalizePaths(locations, value => value.split('packages/webpack-config/').pop());
}

beforeEach(() => {
  delete process.env.WEB_PUBLIC_URL;
});

it(`has consistent defaults`, async () => {
  const locations = await getPathsAsync({ projectRoot });

  const normalized = defaultNormalize(locations);
  expect(normalized).toMatchSnapshot();

  expect(locations.servedPath).toBe('/');
});

it(`uses a custom public path from WEB_PUBLIC_URL over the homepage field from package.json`, async () => {
  process.env.WEB_PUBLIC_URL = 'WEB_PUBLIC_URL-defined';
  const locations = await getPathsAsync({ projectRoot: projectRootCustomHomepage });
  expect(locations.servedPath).toBe('WEB_PUBLIC_URL-defined/');
});

it(`uses a custom public path from the homepage field of a project's package.json`, async () => {
  const locations = await getPathsAsync({ projectRoot: projectRootCustomHomepage });
  expect(locations.servedPath).toMatchSnapshot();
});
// TODO: Bacon: Add test for resolving entry point
// TODO: Bacon: Add test for custom config paths
