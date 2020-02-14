import { ConfigMode } from '@expo/config';

export function getConfigMode(mode: string): ConfigMode {
  return mode === 'production' ? mode : 'development';
}
