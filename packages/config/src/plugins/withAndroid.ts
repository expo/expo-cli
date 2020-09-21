import {
  AnyAndroidFileResourceModifier,
  ExportedConfig,
  PackFileModifierProps,
  PackModifier,
  ProjectFileSystem,
} from '../Config.types';
import { withModifier } from './withAfter';

export function withDangerousBuildGradle<
  T extends ProjectFileSystem = PackFileModifierProps<string>
>(config: ExportedConfig, action: PackModifier<T>): ExportedConfig {
  return withModifier<T>(config, 'android', 'dangerousBuildGradle', action);
}
export function withDangerousAppBuildGradle<
  T extends ProjectFileSystem = PackFileModifierProps<string>
>(config: ExportedConfig, action: PackModifier<T>): ExportedConfig {
  return withModifier<T>(config, 'android', 'dangerousAppBuildGradle', action);
}
export function withDangerousMainActivity<
  T extends ProjectFileSystem = PackFileModifierProps<string>
>(config: ExportedConfig, action: PackModifier<T>): ExportedConfig {
  return withModifier<T>(config, 'android', 'dangerousMainActivity', action);
}
export function withStrings<T extends ProjectFileSystem = AnyAndroidFileResourceModifier>(
  config: ExportedConfig,
  action: PackModifier<T>
): ExportedConfig {
  return withModifier<T>(config, 'android', 'strings', action);
}
