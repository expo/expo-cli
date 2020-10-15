declare module '@react-native-community/cli-platform-ios' {
  import { IOSProjectConfig, IOSProjectParams } from '@react-native-community/cli-types';

  export function projectConfig(path: string, options?: IOSProjectParams): IOSProjectConfig;
}
