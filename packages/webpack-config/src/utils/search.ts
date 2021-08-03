/**
 * Loader flattening inspired by:
 * https://github.com/preactjs/preact-cli-experiment/tree/7b80623/packages/cli-plugin-legacy-config
 */
import { isRegExp } from 'util';
import {
  Configuration,
  Entry,
  Plugin,
  RuleSetCondition,
  RuleSetLoader,
  RuleSetRule,
  RuleSetUse,
  RuleSetUseItem,
} from 'webpack';

import { DevConfiguration } from '../types';

type AnyConfiguration = Configuration | DevConfiguration;

type LoaderItemLoaderPart = Pick<LoaderItem, 'loader' | 'loaderIndex'>;

interface RuleItem {
  rule: RuleSetRule;
  index: number;
}

type ResolvedRuleSet = string | RuleSetLoader;

interface PluginItem {
  plugin: Plugin;
  index: number;
}

interface LoaderItem {
  rule: RuleSetRule;
  ruleIndex: number;
  loader: RuleSetUseItem;
  loaderIndex: number;
}

/**
 *
 * @param loaderName
 * @param rules
 * @category utils
 */
export function findLoader(loaderName: string, rules: RuleSetRule[]): RuleSetRule | null {
  for (const rule of rules) {
    if (
      rule.use &&
      (rule.use as any).loader &&
      ((rule.use as RuleSetLoader).loader!.includes(`/${loaderName}`) ||
        (rule.use as any).loader.includes(`\\${loaderName}`))
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
export function getRules(config: AnyConfiguration): RuleItem[] {
  const { rules = [] } = config.module || {};
  return getRulesAsItems(getRulesFromRules(rules));
}

/**
 * Get the babel-loader rule created by `@expo/webpack-config/loaders`
 *
 * @param config
 * @category utils
 */
export function getExpoBabelLoader(config: AnyConfiguration): RuleSetRule | null {
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
export function getRulesFromRules(rules: RuleSetRule[]): RuleSetRule[] {
  const output: RuleSetRule[] = [];

  for (const rule of rules) {
    if (rule.oneOf) {
      output.push(...getRulesFromRules(rule.oneOf));
    } else {
      output.push(rule);
    }
  }
  return output;
}

/**
 *
 * @param rules
 * @category utils
 */
export function getLoadersFromRules(rules: RuleItem[]): LoaderItem[] {
  const loaders = rules.map(({ rule, index: ruleIndex }) => {
    if (rule.oneOf) {
      return getLoadersFromRules(getRulesAsItems(rule.oneOf));
    }
    return loaderToLoaderItemLoaderPart(rule.loaders || rule.loader || rule.use).map(loader => ({
      ...loader,
      rule,
      ruleIndex,
    }));
  });

  return loaders.reduce((arr, a) => arr.concat(a), []);
}

/**
 *
 * @param config
 * @category utils
 */
export function getLoaders(config: AnyConfiguration): LoaderItem[] {
  const rules = getRules(config);
  return getLoadersFromRules(rules);
}

function loaderToLoaderItemLoaderPart(loader: RuleSetUse | undefined): LoaderItemLoaderPart[] {
  if (!loader) return [];
  const loaders: LoaderItemLoaderPart[] = [];
  if (typeof loader === 'function') {
    loaders.push(...loaderToLoaderItemLoaderPart(loader({})));
  } else if (isRuleSetItem(loader)) {
    loaders.push({ loader, loaderIndex: -1 });
  } else if (Array.isArray(loader)) {
    loaders.push(...loader.map((loader, loaderIndex) => ({ loader, loaderIndex })));
  }
  return loaders;
}

/**
 *
 * @param config
 * @param files
 * @category utils
 */
export function getRulesByMatchingFiles(
  config: AnyConfiguration,
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
export function rulesMatchAnyFiles(config: AnyConfiguration, files: string[]): boolean {
  const rules = getRulesByMatchingFiles(config, files);
  return Object.keys(rules).some(filename => !!rules[filename].length);
}

/**
 *
 * @param rule
 * @category utils
 */
export function resolveRuleSetUse(rule?: RuleSetUse | RuleSetUse[]): ResolvedRuleSet[] {
  if (!rule) return [];
  if (Array.isArray(rule)) {
    const rules = rule as RuleSetUse[];
    let resolved: ResolvedRuleSet[] = [];
    for (const rule of rules) {
      resolved = [...resolved, ...resolveRuleSetUse(rule)];
    }
    return resolved;
  } else if (typeof rule === 'string' || isRuleSetLoader(rule)) {
    return [rule];
  } else if (typeof rule === 'function') {
    return resolveRuleSetUse(rule({}));
  }
  return [rule];
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
export function getPlugins({ plugins = [] }: AnyConfiguration): PluginItem[] {
  return plugins.map((plugin, index) => ({ index, plugin }));
}

/**
 *
 * @param config
 * @param name
 * @category utils
 */
export function getPluginsByName(config: AnyConfiguration, name: string): PluginItem[] {
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
  return typeof loader === 'string' || typeof loader === 'function' || isRuleSetLoader(loader);
}

/**
 *
 * @param loader
 * @category utils
 */
export function isRuleSetLoader(loader: RuleSetUse): loader is RuleSetLoader {
  return Object.keys(loader).some(k => ['loader', 'options', 'indent', 'query'].includes(k));
}

/**
 *
 * @param arg
 * @category utils
 */
export function isEntry(arg: any): arg is Entry {
  if (typeof arg !== 'object' || arg === null) {
    return false;
  }
  return Object.values(arg).every(value => {
    if (Array.isArray(value)) {
      return value.every(value => typeof value === 'string');
    }
    return typeof value === 'string';
  });
}

/**
 *
 * @param arg
 * @category utils
 */
export async function resolveEntryAsync(arg: any): Promise<Entry> {
  if (typeof arg === 'undefined') {
    throw new Error('Webpack config entry cannot be undefined');
  }

  if (typeof arg === 'function') {
    return resolveEntryAsync(await arg());
  } else if (typeof arg === 'string') {
    return resolveEntryAsync([arg]);
  } else if (Array.isArray(arg)) {
    return {
      app: arg,
    };
  } else if (isEntry(arg)) {
    return arg;
  }

  throw new Error('Cannot resolve Webpack config entry prop: ' + arg);
}
