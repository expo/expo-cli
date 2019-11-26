import http from 'http';
import { RawRequest } from '../index.types';
import url from 'url';

/* string | RawSourceMap */
function fetch(uri: string): Promise<any> {
  return new Promise((resolve, reject) => {
    var parts = url.parse(uri);
    var buffer = '';
    var handler = (res: any) => {
      res.on('data', (chunk: any) => {
        buffer += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(buffer);
        } else {
          reject(buffer);
        }
      });
    };
    var request = http.request(parts, handler);
    request.setTimeout(0); // Disable any kind of automatic timeout behavior.
    request.end();
  });
}

const bundleRegex = /^([^.]+)(\.[^.]+)?\.(delta|bundle)$/;
const sourceMapRegex = /^([^.]+)(\.[^.]+)?\.(map)$/;

function _getReactCodeURL(packagerBaseURL: string, platform: string) {
  return url.resolve(packagerBaseURL, `index.${platform}.bundle`);
}

function _getReactMapURL(packagerBaseURL: string, platform: string) {
  return url.resolve(packagerBaseURL, `index.${platform}.map`);
}

function _getAppCodeURL(webpackBaseURL: string, entryFileWithoutExtension: string) {
  // TODO: Bacon: platform ext prolly not needed
  return url.resolve(webpackBaseURL, `${entryFileWithoutExtension}.js`);
}

function _getAppMapURL(webpackBaseURL: string, entryFileWithoutExtension: string) {
  // TODO: Bacon: platform ext prolly not needed
  return url.resolve(webpackBaseURL, `${entryFileWithoutExtension}.js.map`);
}

import { SourceNode, RawSourceMap } from 'source-map';
import { SourceMapConsumer } from 'source-map';

function _createBundleMap(
  reactCode: string,
  reactMap: RawSourceMap,
  appCode: string,
  appMap: RawSourceMap
) {
  const node = new SourceNode();

  const reactSourceMap = SourceNode.fromStringWithSourceMap(
    reactCode,
    new SourceMapConsumer(reactMap)
  );

  // @ts-ignore
  node.add(reactSourceMap);
  // @ts-ignore
  node.add(SourceNode.fromStringWithSourceMap(appCode, new SourceMapConsumer(appMap)));

  return node
    .join('')
    .toStringWithSourceMap()
    .map.toString();
}

export function sourceMapMiddleware(options: {
  packagerBaseURL: string;
  webpackBaseURL: string;
  entryFileWithoutExtension: { [platform: string]: string };
}) {
  const { packagerBaseURL, webpackBaseURL, entryFileWithoutExtension } = options;
  return async (req: RawRequest, res: http.ServerResponse, next: (err?: any) => void) => {
    if (req.url && sourceMapRegex.test(req.url)) {
      // https://github.com/mjohnston/react-native-webpack-server/blob/98c5c4c2a809da90bc076c9de73e3acc586ea8df/lib/Server.js#L205
      const parsedUrl = url.parse(req.url, /* parse query */ true);
      const urlSearch = parsedUrl.search;
      const platform = parsedUrl.query.platform as string;

      // Forward URL params to RN packager
      const reactCodeURL = _getReactCodeURL(packagerBaseURL, platform) + urlSearch;
      const reactMapURL = _getReactMapURL(packagerBaseURL, platform) + urlSearch;
      const appCodeURL = _getAppCodeURL(webpackBaseURL, entryFileWithoutExtension[platform]);
      const appMapURL = _getAppMapURL(webpackBaseURL, entryFileWithoutExtension[platform]);

      try {
        const [reactCode, reactMap, appCode, appMap] = await Promise.all([
          fetch(reactCodeURL),
          fetch(reactMapURL),
          fetch(appCodeURL),
          fetch(appMapURL),
        ]);

        const bundleMap = await _createBundleMap(reactCode, reactMap, appCode, appMap);

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(bundleMap);
      } catch (error) {
        next(error);
      }
    } else {
      next();
    }
  };
}

const SOURCEMAP_REGEX = /\/\/[#@] sourceMappingURL=([^\s'"]*)/;

function _createBundleCode(
  entryFileWithoutExtension: string,
  reactCode: string,
  appCode: string,
  urlSearch: string
): string {
  reactCode = reactCode.replace(SOURCEMAP_REGEX, '');
  appCode = appCode.replace(SOURCEMAP_REGEX, '');
  return reactCode + appCode + `//# sourceMappingURL=/${entryFileWithoutExtension}.map${urlSearch}`;
}

export function bundleMiddleware(options: {
  packagerBaseURL: string;
  webpackBaseURL: string;
  entryFileWithoutExtension: { [platform: string]: string };
}) {
  const { packagerBaseURL, webpackBaseURL, entryFileWithoutExtension } = options;
  return async (req: RawRequest, res: http.ServerResponse, next: (err?: any) => void) => {
    if (req.url && bundleRegex.test(req.url)) {
      // https://github.com/mjohnston/react-native-webpack-server/blob/98c5c4c2a809da90bc076c9de73e3acc586ea8df/lib/Server.js#L205
      const parsedUrl = url.parse(req.url, /* parse query */ true);
      const urlSearch = parsedUrl.search;
      const platform = parsedUrl.query.platform as string;

      // Forward URL params to RN packager
      const reactCodeURL = _getReactCodeURL(packagerBaseURL, platform) + urlSearch;
      const appCodeURL = _getAppCodeURL(webpackBaseURL, entryFileWithoutExtension[platform]);

      try {
        const [reactCode, appCode] = await Promise.all([fetch(reactCodeURL), fetch(appCodeURL)]);

        const bundleCode = await _createBundleCode(
          entryFileWithoutExtension[platform],
          reactCode,
          appCode,
          urlSearch!
        );

        res.setHeader('Content-Type', 'application/javascript');
        res.statusCode = 200;
        res.end(bundleCode);
      } catch (error) {
        next(error);
      }
    } else {
      next();
    }
  };
}
