export default function ({ config }) {
  config.foo = 'bar';
  if (config.name) config.name += '+config-default';
  return config;
}
