import { Webpack } from 'xdl';

import { warnAboutLocalCLI } from '../../utils/migration';

type Options = {
  pwa?: boolean;
  clear?: boolean;
  dev?: boolean;
};

export async function actionAsync(projectRoot: string, options: Options) {
  warnAboutLocalCLI(projectRoot, { localCmd: 'export:web' });

  return Webpack.bundleAsync(projectRoot, {
    ...options,
    dev: typeof options.dev === 'undefined' ? false : options.dev,
  });
}
