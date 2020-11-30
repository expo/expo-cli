import { withPlugins } from '@expo/config-plugins/src/plugins/core-plugins';
import { ExpoConfig } from '@expo/config-types';
import { join } from 'path';

import { withStaticPlugin } from '../withStaticPlugin';

function withInternal(config: ExpoConfig, projectRoot: string) {
  if (!config._internal) config._internal = {};
  config._internal.projectRoot = projectRoot;
  return config;
}

function withInternalRemoved(config: ExpoConfig) {
  delete config._internal;
  return config;
}

const projectRoot = join(__dirname, 'fixtures/project-files');

// Not using in-memory fs because the node resolution isn't mocked out.
describe(withStaticPlugin, () => {
  it(`uses internal projectRoot`, () => {
    let config = {
      name: 'foo',
      slug: 'foo',
    };

    config = withPlugins(config, [
      c => withInternal(c, projectRoot),
      c =>
        withStaticPlugin(c, {
          plugin: './my-plugin.js',
        }),
      withInternalRemoved,
    ]);

    expect(config).toStrictEqual({
      name: 'foo',
      slug: 'foo',
      extras: {
        modified: true,
      },
    });
  });

  it(`passes props to plugin`, () => {
    let config = {
      name: 'foo',
      slug: 'foo',
    };

    config = withPlugins(config, [
      c =>
        withStaticPlugin(c, {
          plugin: { resolve: './my-plugin.js', props: { foobar: true } },
          projectRoot,
        }),
      // Uses a folder with index.js
      c =>
        withStaticPlugin(c, {
          plugin: { resolve: './beta' },
          projectRoot,
        }),
    ]);

    expect(config).toStrictEqual({
      name: 'foo',
      slug: 'foo',
      extras: {
        beta: true,
        modified: true,
        foobar: true,
      },
    });
  });

  it(`fails to resolve a non-existent file`, () => {
    const config = {
      name: 'foo',
      slug: 'foo',
    };

    expect(() =>
      withStaticPlugin(config, {
        plugin: { resolve: './not-existing.js', props: { foobar: true } },
        projectRoot,
      })
    ).toThrow(/Cannot find module '.\/not-existing.js'/);
  });
});
