import { resolveModule } from '@expo/config';
import path from 'path';
import serveStatic from 'serve-static';

export default function debuggerUIMiddleware(): any {
  try {
    const { debuggerUIMiddleware } = require('@react-native-community/cli-debugger-ui');
    return debuggerUIMiddleware();
  } catch (_) {
    const middlewareManagerPath = resolveModule(
      '@react-native-community/cli/build/commands/server/middleware/MiddlewareManager.js',
      process.cwd(),
      {} as any
    );

    const debuggerUIFolder = path.join(path.dirname(middlewareManagerPath), '..', 'debugger-ui');
    // console.log('found debugger UI folder: ', debuggerUIFolder);
    return serveStatic(debuggerUIFolder);
  }
}
