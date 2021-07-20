import { Webpack } from 'xdl';

type Options = {
  pwa?: boolean;
  clear?: boolean;
  dev?: boolean;
};

export async function actionAsync(projectRoot: string, options: Options) {
  return Webpack.bundleAsync(projectRoot, {
    ...options,
    dev: typeof options.dev === 'undefined' ? false : options.dev,
  });
}
