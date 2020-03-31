import { EventEmitter } from 'events';

import { ConfigT } from 'metro-config';
import JestHasteMap from 'jest-haste-map';

type HasteFS = {
  exists(filePath: string): boolean;
  getAllFiles(): Array<string>;
  getFileIterator(): Iterator<string>;
  getModuleName(filePath: string): string | null | undefined;
  getSha1(string): string | null | undefined;
  matchFiles(pattern: RegExp | string): Array<string>;
};

type ModuleMap = {
  getModule(
    name: string,
    platform: string | null,
    supportsNativePlatform: boolean | null | undefined
  ): string | null | undefined;
  getPackage(
    name: string,
    platform: string | null,
    supportsNativePlatform: boolean | null | undefined
  ): string | null | undefined;
};

declare class DependencyGraph extends EventEmitter {
  constructor(options: {
    readonly config: ConfigT;
    readonly haste: JestHasteMap;
    readonly initialHasteFS: HasteFS;
    readonly initialModuleMap: ModuleMap;
  });

  static load(config: ConfigT, options?: { readonly watch?: boolean }): Promise<DependencyGraph>;

  getSha1(filename: string): string;

  getWatcher(): JestHasteMap;

  end(): void;

  resolveDependency(from: string, to: string, platform: string | null | undefined): string;

  getHasteName(filePath: string): string;
}

export default DependencyGraph;
