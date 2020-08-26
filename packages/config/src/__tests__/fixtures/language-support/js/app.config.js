module.exports = function ({ config }) {
  config.foo = 'bar';
  if (config.name) config.name += '+config';
  if (config.slug) config.slug += '+config';
  return config;
};
