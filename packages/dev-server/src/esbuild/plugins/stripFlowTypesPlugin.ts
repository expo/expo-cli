import { Plugin } from 'esbuild';
import findUp from 'find-up';
// @ts-ignore
import flowRemoveTypes from 'flow-remove-types';
import fs from 'fs';
import path from 'path';
import resolveFrom from 'resolve-from';

const projectRoot = process.cwd().replace(/\\/g, '/');

let cache = new Map();
let updateCache = false;
const cacheFile = projectRoot + '/.expo/esbuild/cache/removed-flow.json';

function findUpPackageJson(root: string) {
  const packageJson = findUp.sync('package.json', { cwd: root });
  return packageJson || null;
}

function moduleRoot(projectRoot: string, moduleId: string) {
  const moduleEntry = resolveFrom.silent(projectRoot, moduleId);
  if (moduleEntry) {
    const pkgJson = findUpPackageJson(moduleEntry);
    return pkgJson ? path.dirname(pkgJson) : null;
  }
  return null;
}

function stripFlowTypesPlugin(projectRoot: string, modules: string[], cleanCache?: boolean) {
  if (fs.existsSync(cacheFile) && !cleanCache) {
    cache = new Map(JSON.parse(fs.readFileSync(cacheFile).toString()));
  }

  const resolvedModules = modules
    .map(module => {
      return moduleRoot(projectRoot, module);
    })
    .filter(Boolean) as string[];

  const packagesRemoveFlow = new RegExp(
    resolvedModules.map(module => `${module}.*\\.jsx?$`).join('|'),
    'g'
  );

  const plugin: Plugin = {
    name: 'stripFlowTypes',
    setup(build) {
      build.onLoad({ filter: packagesRemoveFlow, namespace: 'file' }, async args => {
        const relpath = path.relative(process.cwd(), args.path);
        const cacheResult = cache.get(relpath);
        if (cacheResult) {
          return { contents: cacheResult, loader: 'jsx' };
        }
        const source = fs.readFileSync(relpath, 'utf8');
        const output = flowRemoveTypes(/* '// @flow\n' + */ source, {
          pretty: false,
          all: true,
          ignoreUninitializedFields: true,
        });
        const contents = output.toString().replace(/static\s+\+/g, 'static ');
        cache.set(relpath, contents);
        updateCache = true;
        return { contents, loader: 'jsx' };
      });
      build.onEnd(() => {
        if (updateCache) fs.writeFileSync(cacheFile, JSON.stringify([...cache.entries()]));
      });
    },
  };
  return plugin;
}

export default stripFlowTypesPlugin;
