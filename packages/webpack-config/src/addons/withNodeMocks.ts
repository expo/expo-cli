import { AnyConfiguration } from '../types';

// Some libraries import Node modules but don't use them in the browser.
// Tell Webpack to provide empty mocks for them so importing them works.
export default function withNodeMocks(webpackConfig: AnyConfiguration): AnyConfiguration {
  if (
    typeof webpackConfig.target === 'string' &&
    ['electron', 'electron-main', 'node'].includes(webpackConfig.target)
  ) {
    return webpackConfig;
  }

  webpackConfig.node = {
    module: 'empty',
    dgram: 'empty',
    dns: 'mock',
    fs: 'empty',
    http2: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty',
    ...(webpackConfig.node || {}),
  };

  return webpackConfig;
}
