import Log from '@expo/bunyan';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { parse as parseUrl } from 'url';

import { ReactNativeStackFrame, StackFrame, Symbolicator } from './Symbolicator';

function getFilenameFromUrl(url: string): string {
  const parsedUrl = parseUrl(url, true);
  const { platform } = parsedUrl.query || {};
  const filePath = parsedUrl.pathname!.split('/').pop()!;
  return filePath.replace('.bundle', [platform && `.${platform}`, `.js`].filter(Boolean).join(''));
}

// TODO: For some reason the LogBox shows the error as unsymbolicated until you interact with the page.

export function createSymbolicateMiddleware({
  logger,
  customizeFrame,
  dist,
}: {
  logger: Log;
  customizeFrame: (frame: StackFrame) => StackFrame;
  dist: string;
}) {
  const symbolicator = new Symbolicator({
    logger,
    customizeFrame,
    async readFileFromBundler(fileUrl: string) {
      throw new Error('unimplemented -- TODO');
    },
    async readSourceMapFromBundler(fileUrl: string) {
      // http://127.0.0.1:19000/index.bundle?platform=ios&dev=true&hot=false&minify=false
      const fileName = getFilenameFromUrl(fileUrl);
      if (fileName) {
        const filePath = path.join(dist, fileName);
        const fallbackSourceMapFilename = `${filePath}.map`;
        // TODO: Read from some kinda cache
        const bundle = await fs.promises.readFile(fallbackSourceMapFilename, 'utf8');
        const [, sourceMappingUrl] = /sourceMappingURL=(.+)$/.exec(bundle) || [
          undefined,
          undefined,
        ];
        const [sourceMapBasename] = sourceMappingUrl?.split('?') ?? [undefined];

        let sourceMapFilename = fallbackSourceMapFilename;
        if (sourceMapBasename) {
          sourceMapFilename = path.join(path.dirname(filePath), sourceMapBasename);
        }
        try {
          // TODO: Read from some kinda cache
          return fs.promises.readFile(sourceMapFilename, 'utf8');
        } catch {
          logger.warn(
            {
              tag: 'expo',
              sourceMappingUrl,
              sourceMapFilename,
            },
            'Failed to read source map from sourceMappingURL, trying fallback'
          );
          return fs.promises.readFile(fallbackSourceMapFilename, 'utf8');
        }
      } else {
        throw new Error(`Cannot infer filename from url: ${fileUrl}`);
      }
    },
  });
  return async function (
    req: IncomingMessage & { body?: any; rawBody?: any },
    res: ServerResponse
  ) {
    try {
      // TODO: Fix body not being set
      if (!req.rawBody) {
        res.writeHead(400).end('Missing request body.');
        return;
      }

      const { stack } = JSON.parse(req.rawBody as string) as {
        stack: ReactNativeStackFrame[];
      };

      if (!Symbolicator.inferPlatformFromStack(stack)) {
        res.writeHead(400).end('Missing platform in stack');
        return;
      }

      res.end(JSON.stringify(await symbolicator.process(stack)));
    } catch (error) {
      logger.error({ tag: 'expo' }, `Failed to symbolicate: ${error} ${error.stack}`);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  };
}
