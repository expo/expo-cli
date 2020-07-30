declare module '@react-native-community/cli-platform-android' {
  import { AndroidProjectConfig, AndroidProjectParams } from '@react-native-community/cli-types';

  export function projectConfig(path: string, options?: AndroidProjectParams): AndroidProjectConfig;
}
