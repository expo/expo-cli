import { Plugin } from 'esbuild';
import fs from 'fs';
import path from 'path';

const patchPlugin: Plugin = {
  name: 'patches',
  setup(build) {
    build.onLoad({ filter: /views[\\|/]GestureHandlerNative\.js$/ }, args => {
      return replace(args, ', PanGestureHandlerGestureEvent', '');
    });
    build.onLoad(
      { filter: /react-native-maps[\\|/]lib[\\|/]components[\\|/]AnimatedRegion.js$/ },
      args => {
        return replace(
          args,
          `AnimatedWithChildren.name !== 'AnimatedWithChildren'`,
          `!AnimatedWithChildren.name.startsWith('AnimatedWithChildren')`
        );
      }
    );
  },
};

function replace(args: { path: string }, remove: string, include: string) {
  const relpath = path.relative(process.cwd(), args.path);
  const source = fs.readFileSync(relpath, 'utf8');
  return { contents: source.replace(remove, include) };
}

export default patchPlugin;
