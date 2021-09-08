import assert from 'assert';
import type { IncomingMessage } from 'http';
import webpack from 'webpack';

export type AnyCompiler = webpack.Compiler | webpack.MultiCompiler;

/**
 * Read a file from the webpack "compiler".
 *
 * @param compiler webpack compiler
 * @param filename Like: `/Users/evanbacon/Documents/GitHub/lab/yolo47/web-build/index.bundle`
 * @returns
 */
export function getFileFromCompilerAsync(
  compiler: AnyCompiler,
  { fileName, platform }: { fileName: string; platform?: string }
): Promise<string> {
  const platformCompiler = getCompilerForPlatform(compiler, platform);

  console.log(platformCompiler.records);
  return new Promise<string>((resolve, reject) =>
    (platformCompiler.outputFileSystem as any).readFile(
      fileName,
      (error: Error | undefined, content: string | Buffer) => {
        if (error || !content) {
          reject(error);
        } else {
          resolve(content.toString());
        }
      }
    )
  );
}

export function getPlatformFromRequest(request: IncomingMessage): string | null {
  // Use the expo updates spec to check the platform.
  if (typeof request.headers['expo-platform'] === 'string') {
    return request.headers['expo-platform'] ?? null;
  }
  if (typeof request.headers['exponent-platform'] === 'string') {
    return request.headers['exponent-platform'] ?? null;
  }

  // Hack iOS UA sniffing
  if (
    typeof request.headers['user-agent'] === 'string' &&
    request.headers['user-agent'].includes('Expo')
  ) {
    return request.headers['user-agent'].includes('CFNetwork') ? 'ios' : 'android';
  }
  // Hack Android UA sniffing
  if (
    typeof request.headers['user-agent'] === 'string' &&
    request.headers['user-agent'].includes('okhttp')
  ) {
    return 'android';
  }

  // Get the platform from the query params cheaply.
  return request?.url?.match?.(/[?|&]platform=(\w+)[&|\\]/)?.[1] ?? null;
}

/**
 * Get the Webpack compiler for a given platform.
 * In Expo we distinguish platforms by using the `name` property of the Webpack config.
 *
 * When the platform is undefined, or the compiler cannot be identified, we assert.
 *
 * @param compiler
 * @param platform
 * @returns
 */
export function getCompilerForPlatform(compiler: AnyCompiler, platform?: string): webpack.Compiler {
  if (!('compilers' in compiler)) {
    return compiler;
  }
  assert(platform, 'platform must be provided for multi-compiler servers');
  const platformCompiler = compiler.compilers.find(({ options }) => options.name === platform);
  assert(platformCompiler, `Could not find Webpack compiler for platform: ${platform}`);
  return platformCompiler;
}
