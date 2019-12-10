module.exports = function({ config }) {
  config.foo = 'bar';
  if (config.name) config.name += '+config';
  return config;
};
