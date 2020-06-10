import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoConfig = {
    processCwd: process.cwd(),
  };
  return expoConfig;
};
