import path from 'path';
import fs from 'fs';
import { Webpack } from '@expo/xdl';
const projectRoot = fs.realpathSync(path.resolve(__dirname, '../basic'));

const DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 4;

beforeEach(() => {
  process.env.EXPO_DEBUG = true;
});

it(
  `starts`,
  async () => {
    const info = await Webpack.startAsync(projectRoot, {
      nonInteractive: true,
      verbose: true,
      mode: 'development',
      webpackEnv: {
        removeUnusedImportExports: false,
        report: false,
      },
    });

    console.log(`WebpackDevServer listening at localhost:${info.port}`);

    if (info.server) {
      info.server.close();
    }
  },
  DEFAULT_TIMEOUT_INTERVAL
);

it(
  `builds`,
  async () => {
    await buildAsync({ removeUnusedImportExports: false });
  },
  DEFAULT_TIMEOUT_INTERVAL
);

it(
  `builds with tree-shaking`,
  async () => {
    await buildAsync({ removeUnusedImportExports: true });
  },
  DEFAULT_TIMEOUT_INTERVAL
);

async function buildAsync({ removeUnusedImportExports }) {
  await Webpack.bundleAsync(projectRoot, {
    nonInteractive: true,
    verbose: true,
    mode: 'production',
    webpackEnv: {
      removeUnusedImportExports,
      report: !process.env.CI,
    },
  });
}
