import path from 'path';

import { conditionMatchesFile, getRules } from '../../utils/search';
import { getBabelLoaderRuleFromEnv } from '../createAllLoaders';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');

const env = {
  projectRoot,
  mode: 'development',
  config: { web: { build: { babel: { include: ['custom-lib'] } } } },
};

const rules = getRules({
  module: {
    rules: [getBabelLoaderRuleFromEnv(env)],
  },
});
for (const library of [
  'react-native-foo',
  'custom-lib',
  'expo-foo',
  '@expo/foo',
  'react-navigation-foo',
]) {
  it(`matches against libraries ${library}`, () => {
    const matches = rules.filter(({ rule }) =>
      conditionMatchesFile(rule, path.join(projectRoot, 'node_modules', library, `foo.js`))
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
}

for (const library of ['vue-foo', 'angular-foo', 'not-expo-foo', 'lodash']) {
  it(`doesn't match against libraries ${library}`, () => {
    const matches = rules.filter(({ rule }) =>
      conditionMatchesFile(rule, path.join(projectRoot, 'node_modules', library, `foo.js`))
    );
    expect(matches.length).toBe(0);
  });
}
for (const file of ['js', 'jsx', 'tsx', 'ts', 'mjs']) {
  it(`matches against ${file}`, () => {
    const matches = rules.filter(({ rule }) =>
      conditionMatchesFile(rule, path.join(projectRoot, `foo.${file}`))
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
}
for (const file of ['xml', 'json', 'foo', 'css', 'png']) {
  it(`doesn't match against ${file}`, () => {
    const matches = rules.filter(({ rule }) =>
      conditionMatchesFile(rule, path.join(projectRoot, `foo.${file}`))
    );
    expect(matches.length).toBe(0);
  });
}
