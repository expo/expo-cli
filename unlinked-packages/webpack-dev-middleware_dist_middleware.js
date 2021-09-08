'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = wrapper;

var _path = _interopRequireDefault(require('path'));
var _mimeTypes = _interopRequireDefault(require('mime-types'));

var _getFilenameFromUrl = _interopRequireDefault(require('./utils/getFilenameFromUrl'));
var _handleRangeHeaders = _interopRequireDefault(require('./utils/handleRangeHeaders'));
var _ready = _interopRequireDefault(require('./utils/ready'));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function getPlatformFromRequest(request) {
  var _a, _b, _c, _d, _e;

  console.log('getPlatformFromRequest:', request.headers, request.url);
  // Use the expo updates spec to check the platform.
  if (typeof request.headers['expo-platform'] === 'string') {
    return (_a = request.headers['expo-platform']) !== null && _a !== void 0 ? _a : null;
  }
  if (typeof request.headers['exponent-platform'] === 'string') {
    return (_a = request.headers['exponent-platform']) !== null && _a !== void 0 ? _a : null;
  }
  // Hack
  if (
    typeof request.headers['user-agent'] === 'string' &&
    request.headers['user-agent'].includes('Expo')
  ) {
    return request.headers['user-agent'].includes('CFNetwork') ? 'ios' : 'android';
  }
  if (
    typeof request.headers['user-agent'] === 'string' &&
    request.headers['user-agent'].includes('okhttp')
  ) {
    return 'android';
  }
  // Get the platform from the query params cheaply.
  return (_e =
    (_d =
      (_c =
        (_b = request === null || request === void 0 ? void 0 : request.url) === null ||
        _b === void 0
          ? void 0
          : _b.match) === null || _c === void 0
        ? void 0
        : _c.call(_b, /[?|&]platform=(\w+)[&|\\]/)) === null || _d === void 0
      ? void 0
      : _d[1]) !== null && _e !== void 0
    ? _e
    : null;
}
function getCompilerForPlatform(compiler, platform) {
  if (!('compilers' in compiler)) {
    return compiler;
  }
  const platformCompiler = compiler.compilers.find(({ options }) => options.name === platform);
  console.log(
    '[wdm] choose compiler:',
    compiler.compilers.map(({ options }) => options.name)
  );
  return platformCompiler;
}
// TODO: Get rid of this hack
function getImmutableWebpackDevMiddlewareContext(compiler) {
  const context = {
    options: {
      index: undefined,
      publicPath: ((compiler.options || {}).output || {}).publicPath || '/',
    },
    outputFileSystem: compiler.outputFileSystem,
    stats: platformStats[compiler.name],
  };
  return context;
}
const platformStats = {};
// TODO: Get rid of this hack
function listenForPlatformStats(compiler) {
  let compilers = [];
  if ('compilers' in compiler) {
    compilers = compiler.compilers;
  } else {
    compilers = [compiler];
  }
  for (const compiler of compilers) {
    if (!compiler.name) {
      throw new Error('Webpack config did not provide a platform as the name property');
    }
    (compiler.webpack ? compiler.hooks.afterDone : compiler.hooks.done).tap(
      'webpack-dev-middleware',
      stats => {
        platformStats[compiler.name] = stats;
      }
    );
  }
}

function wrapper(context) {
  listenForPlatformStats(context.compiler);
  return async function middleware(req, res, next) {
    const acceptedMethods = context.options.methods || ['GET', 'HEAD']; // fixes #282. credit @cexoso. in certain edge situations res.locals is undefined.
    // eslint-disable-next-line no-param-reassign

    res.locals = res.locals || {};

    if (!acceptedMethods.includes(req.method)) {
      await goNext();
      return;
    }

    (0, _ready.default)(context, processRequest, req);

    async function goNext() {
      if (!context.options.serverSideRender) {
        return next();
      }

      return new Promise(resolve => {
        (0, _ready.default)(
          context,
          () => {
            // eslint-disable-next-line no-param-reassign
            res.locals.webpack = {
              devMiddleware: context,
            };
            resolve(next());
          },
          req
        );
      });
    }

    async function processRequest() {
      let _context = context;
      const platform = getPlatformFromRequest(req) || 'web';
      if (platform) {
        if (platform !== 'web') {
          debugger;
        }
        console.log('[wdm] Diff request:', platform);
        const compiler = getCompilerForPlatform(context.compiler, platform);
        if (compiler) {
          _context = getImmutableWebpackDevMiddlewareContext(compiler);
        }
      }
      const filename = (0, _getFilenameFromUrl.default)(_context, req.url);
      let { headers } = context.options;

      if (typeof headers === 'function') {
        headers = headers(req, res, context);
      }

      let content;

      if (!filename) {
        await goNext();
        return;
      }

      try {
        content = _context.outputFileSystem.readFileSync(filename);
      } catch (_ignoreError) {
        await goNext();
        return;
      }

      const contentTypeHeader = res.get ? res.get('Content-Type') : res.getHeader('Content-Type');

      if (!contentTypeHeader) {
        // content-type name(like application/javascript; charset=utf-8) or false
        const contentType = _mimeTypes.default.contentType(_path.default.extname(filename)); // Only set content-type header if media type is known
        // https://tools.ietf.org/html/rfc7231#section-3.1.1.5

        if (contentType) {
          // Express API
          if (res.set) {
            res.set('Content-Type', contentType);
          } // Node.js API
          else {
            res.setHeader('Content-Type', contentType);
          }
        }
      }

      if (headers) {
        const names = Object.keys(headers);

        for (const name of names) {
          // Express API
          if (res.set) {
            res.set(name, headers[name]);
          } // Node.js API
          else {
            res.setHeader(name, headers[name]);
          }
        }
      } // Buffer

      content = (0, _handleRangeHeaders.default)(context, content, req, res); // Express API

      if (res.send) {
        res.send(content);
      } // Node.js API
      else {
        res.setHeader('Content-Length', content.length);

        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(content);
        }
      }
    }
  };
}
