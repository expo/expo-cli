import { ConfigContext, ExpoConfig } from '@expo/config';

const foo = { bar: { foo: 'value' } };

export default function ({ config }: ConfigContext): ExpoConfig {
  config.name = 'rewrote+' + config.name;
  // Supports optionals and nullish
  config.foo = 'bar+' + (foo.bar?.foo ?? 'invalid');
  return config;
}
