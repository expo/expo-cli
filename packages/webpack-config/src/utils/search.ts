/**
 * Loader flattening inspired by:
 * https://github.com/preactjs/preact-cli-experiment/tree/7b80623/packages/cli-plugin-legacy-config
 */
import { isRegExp } from 'util';
import {
  Configuration,
  RuleSetCondition,
  RuleSetRule,
  RuleSetUse,
  RuleSetUseItem,
  WebpackPluginInstance,
} from 'webpack';

interface RuleItem {
  rule: RuleSetRule;
  index: number;
}

interface PluginItem {
  plugin: WebpackPluginInstance;
  index: number;
}

/**
 *
 * @param rules
 * @category utils
 */
export function getRulesAsItems(rules: RuleSetRule[]): RuleItem[] {
  return rules.map((rule, index) => ({
    index,
    rule,
  }));
}

/**
 *
 * @param config
 * @category utils
 */
export function getRules(config: Configuration): RuleItem[] {
  const { rules = [] } = config.module || {};
  return getRulesAsItems(getRulesFromRules(rules));
}

/**
 * Get the babel-loader rule created by `@expo/webpack-config/loaders`
 *
 * @param config
 * @category utils
 */
export function getExpoBabelLoader(config: Configuration): RuleSetRule | null {
  const { rules = [] } = config.module || {};
  const currentRules = getRulesAsItems(getRulesFromRules(rules));
  for (const ruleItem of currentRules) {
    const rule: any = ruleItem.rule;
    if (
      rule.use &&
      typeof rule.use === 'object' &&
      rule.use.options?.caller?.__dangerous_rule_id === 'expo-babel-loader'
    ) {
      return rule;
    }
  }
  return null;
}

/**
 *
 * @param rules
 * @category utils
 */
export function getRulesFromRules(rules: (RuleSetRule | '...')[]): RuleSetRule[] {
  const output: RuleSetRule[] = [];

  for (const rule of rules) {
    if (rule !== '...') {
      if (rule.oneOf) {
        output.push(...getRulesFromRules(rule.oneOf));
      } else {
        output.push(rule);
      }
    }
  }
  return output;
}

/**
 *
 * @param config
 * @param files
 * @category utils
 */
export function getRulesByMatchingFiles(
  config: Configuration,
  files: string[]
): { [key: string]: RuleItem[] } {
  const rules = getRules(config);
  const selectedRules: { [key: string]: RuleItem[] } = {};
  for (const file of files) {
    selectedRules[file] = rules.filter(({ rule }) => conditionMatchesFile(rule.test, file));
  }
  return selectedRules;
}

/**
 *
 * @param config
 * @param files
 * @category utils
 */
export function rulesMatchAnyFiles(config: Configuration, files: string[]): boolean {
  const rules = getRulesByMatchingFiles(config, files);
  return Object.keys(rules).some(filename => !!rules[filename].length);
}

/**
 *
 * @param condition
 * @param file
 * @category utils
 */
export function conditionMatchesFile(
  condition: RuleSetCondition | undefined,
  file: string
): boolean {
  if (!condition) return false;
  if (isRegExp(condition)) {
    return condition.test(file);
  } else if (typeof condition === 'string') {
    return file.startsWith(condition);
  } else if (typeof condition === 'function') {
    return Boolean(condition(file));
  } else if (Array.isArray(condition)) {
    return condition.some(c => conditionMatchesFile(c, file));
  }
  return Object.entries(condition)
    .map(([key, value]) => {
      switch (key) {
        case 'test':
          return conditionMatchesFile(value, file);
        case 'include':
          return conditionMatchesFile(value, file);
        case 'exclude':
          return !conditionMatchesFile(value, file);
        case 'and':
          return (value as RuleSetCondition[]).every(c => conditionMatchesFile(c, file));
        case 'or':
          return (value as RuleSetCondition[]).some(c => conditionMatchesFile(c, file));
        case 'not':
          return (value as RuleSetCondition[]).every(c => !conditionMatchesFile(c, file));
        default:
          return true;
      }
    })
    .every(b => b);
}

/**
 *
 * @param param0
 * @category utils
 */
export function getPlugins({ plugins = [] }: Configuration): PluginItem[] {
  return plugins.map((plugin, index) => ({ index, plugin }));
}

/**
 *
 * @param config
 * @param name
 * @category utils
 */
export function getPluginsByName(config: Configuration, name: string): PluginItem[] {
  return getPlugins(config).filter(({ plugin }: PluginItem) => {
    if (plugin && plugin.constructor) {
      return plugin.constructor.name === name;
    }
    return false;
  });
}

/**
 *
 * @param loader
 * @category utils
 */
export function isRuleSetItem(loader: RuleSetUse): loader is RuleSetUseItem {
  return typeof loader === 'string' || typeof loader === 'function';
}
