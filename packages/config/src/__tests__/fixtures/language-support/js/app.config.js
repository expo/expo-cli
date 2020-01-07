module.exports = function({ config, mode }) {
  config.foo = 'bar';
  if (config.name) config.name += '+config+' + mode;
  if (config.slug) config.slug += '+config';
  return config;
};
