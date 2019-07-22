import path from 'path';
import fs from 'fs';
import { Webpack } from '@expo/xdl';
const projectRoot = fs.realpathSync(path.resolve(__dirname, '../basic'));

const DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 4;

beforeEach(() => {
  process.env.EXPO_DEBUG = true;
  //   process.env.EXPO_WEB_INFO = true;
});

afterEach(() => {
  process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = false;
});

it(
  `starts`,
  async () => {
    process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = false;

    const info = await Webpack.startAsync(
      projectRoot,
      {
        nonInteractive: true,
      },
      true
    );
    console.log('WebpackDevServer listening at localhost:', info.url.split(':').pop());
    if (info.server) {
      info.server.close();
    }
  },
  DEFAULT_TIMEOUT_INTERVAL
);

it(
  `builds`,
  async () => {
    process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = false;
    await buildAsync();
  },
  DEFAULT_TIMEOUT_INTERVAL
);

it(
  `builds with tree-shaking`,
  async () => {
    process.env.TESTING_REMOVE_UNUSED_IMPORT_EXPORTS = true;
    await buildAsync();
  },
  DEFAULT_TIMEOUT_INTERVAL
);

async function buildAsync() {
  await Webpack.bundleAsync(
    projectRoot,
    {
      nonInteractive: true,
    },
    true
  );
}
