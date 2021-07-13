import { ImportMap, resolve } from 'deno-importmap';
import { Plugin } from 'esbuild';
import path from 'path';

export default function aliasPlugin(alias: ImportMap['imports']) {
  const importMap: ImportMap = { imports: alias };
  const plugin: Plugin = {
    name: 'alias',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args: any) => {
        const resolvedPath = resolve(args.path, importMap);
        if (args.path === resolvedPath) return;
        return { path: require.resolve(path.resolve(resolvedPath)) };
      });
    },
  };
  return plugin;
}
