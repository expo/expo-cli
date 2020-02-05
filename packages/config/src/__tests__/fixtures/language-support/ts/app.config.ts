import { ConfigContext, ExpoConfig } from '../../../../';

export default function({ config }: ConfigContext): ExpoConfig {
  config.name = 'rewrote+' + config.name;
  config.foo = 'bar';
  return config;
}
