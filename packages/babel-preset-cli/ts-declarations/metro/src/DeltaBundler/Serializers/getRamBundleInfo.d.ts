import { ModuleTransportLike } from '../../shared/types';

export interface RamBundleInfo {
  getDependencies: (filePath: string) => Set<string>;
  startupModules: ReadonlyArray<ModuleTransportLike>;
  lazyModules: ReadonlyArray<ModuleTransportLike>;
  groups: Map<number, Set<number>>;
}
