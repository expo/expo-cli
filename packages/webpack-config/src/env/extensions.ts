import { getManagedExtensions } from '@expo/config/paths';

export function getModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  return getManagedExtensions(platforms).map(value => `.${value}`);
}
