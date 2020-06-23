import { Webpack } from '@expo/xdl';

export default async function (
  projectDir: string,
  options: { pwa?: boolean; clear?: boolean; dev?: boolean }
) {
  return await Webpack.bundleAsync(projectDir, {
    ...options,
    dev: typeof options.dev === 'undefined' ? false : options.dev,
  });
}
