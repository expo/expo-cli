/* eslint-env node */

import path from 'path';

import { normalizePaths } from '../../utils';
import { getPaths, getPathsAsync, getPublicPaths, getServedPath } from '../paths';

jest.unmock('resolve-from');

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');
const projectRootCustomHomepage = path.resolve(__dirname, '../../../e2e/custom-homepage');
const projectRootMinimum = path.resolve(__dirname, '../../../e2e/minimum');

function defaultNormalize(locations) {
  return normalizePaths(locations, value => value.split('packages/webpack-config/').pop());
}

beforeEach(() => {
  delete process.env.WEB_PUBLIC_URL;
});

it(`works with no app.json`, async () => {
  const locations = await getPathsAsync(projectRootMinimum);

  const normalized = defaultNormalize(locations);
  expect(normalized).toMatchSnapshot();

  expect(locations.servedPath).toBe('/');
});

it(`has consistent defaults`, async () => {
  const locations = await getPathsAsync(projectRoot);

  const normalized = defaultNormalize(locations);
  expect(normalized).toMatchSnapshot();

  expect(locations.servedPath).toBe('/');
});

it(`matches sync and async results`, async () => {
  const locations = getPaths(projectRoot, { platform: 'web' });
  const normalized = defaultNormalize(locations);

  const locationsAsync = await getPathsAsync(projectRoot);
  const normalizedAsync = defaultNormalize(locationsAsync);

  expect(JSON.stringify(normalized)).toBe(JSON.stringify(normalizedAsync));
});

it(`uses a custom public path from WEB_PUBLIC_URL over the homepage field from package.json`, async () => {
  process.env.WEB_PUBLIC_URL = 'WEB_PUBLIC_URL-defined';
  const servedPath = await getServedPath(projectRootCustomHomepage);
  expect(servedPath).toBe('WEB_PUBLIC_URL-defined/');
});

it(`uses a custom public path from the homepage field of a project's package.json`, async () => {
  const servedPath = await getServedPath(projectRootCustomHomepage);
  expect(servedPath).toMatchSnapshot();
});

it(`changes public paths based on mode`, async () => {
  process.env.WEB_PUBLIC_URL = 'WEB_PUBLIC_URL-defined';

  const devPaths = await getPublicPaths({
    projectRoot: projectRootCustomHomepage,
    mode: 'development',
  });

  const prodPaths = await getPublicPaths({
    projectRoot: projectRootCustomHomepage,
    mode: 'production',
  });

  expect(devPaths.publicPath).not.toBe(prodPaths.publicPath);
  expect(devPaths.publicUrl).not.toBe(prodPaths.publicUrl);

  expect(prodPaths.publicUrl).toBe(process.env.WEB_PUBLIC_URL);
});

// TODO: Bacon: Add test for resolving entry point
// TODO: Bacon: Add test for custom config paths
