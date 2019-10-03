/**
 * Loader flattening inspired by:
 * https://github.com/preactjs/preact-cli-experiment/tree/7b80623/packages/cli-plugin-legacy-config
 */
import { isRegExp } from 'util';
import {
  Configuration,
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
  plugin: object;
  index: number;
}

interface LoaderItem {
  rule: RuleSetRule;
  ruleIndex: number;
  loader: RuleSetUseItem;
  loaderIndex: number;
}

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

export function getRulesAsItems(rules: RuleSetRule[]): RuleItem[] {
  return rules.map((rule, index) => ({
    index,
    rule,
  }));
}

export function getRules(config: AnyConfiguration): RuleItem[] {
  const { preLoaders = [], postLoaders = [], rules = [] } = config.module || {};
  return getRulesAsItems(getRulesFromRules([...preLoaders, ...postLoaders, ...rules]));
}

export function getRulesFromRules(rules: RuleSetRule[]): RuleSetRule[] {
  let output: RuleSetRule[] = [];

  for (const rule of rules) {
    if (rule.oneOf) {
      output.push(...getRulesFromRules(rule.oneOf));
    } else {
      output.push(rule);
    }
  }
  return output;
}

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

export function getLoaders(config: AnyConfiguration): LoaderItem[] {
  const rules = getRules(config);
  return getLoadersFromRules(rules);
}

function loaderToLoaderItemLoaderPart(loader: RuleSetUse | undefined): Array<LoaderItemLoaderPart> {
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

export function getRulesByMatchingFiles(
  config: AnyConfiguration,
  files: string[]
): { [key: string]: RuleItem[] } {
  const rules = getRules(config);
  let selectedRules: { [key: string]: RuleItem[] } = {};
  for (const file of files) {
    selectedRules[file] = rules.filter(({ rule }) => conditionMatchesFile(rule.test, file));
  }
  return selectedRules;
}

export function rulesMatchAnyFiles(config: AnyConfiguration, files: string[]): boolean {
  const rules = getRulesByMatchingFiles(config, files);
  return Object.keys(rules).some(filename => !!rules[filename].length);
}

export function resolveRuleSetUse(rule?: RuleSetUse | RuleSetUse[]): ResolvedRuleSet[] {
  if (!rule) return [];
  if (Array.isArray(rule)) {
    const rules = rule as Array<RuleSetUse>;
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

export function getPlugins({ plugins = [] }: AnyConfiguration): PluginItem[] {
  return plugins.map((plugin, index) => ({ index, plugin }));
}

export function getPluginsByName(config: AnyConfiguration, name: string): PluginItem[] {
  return getPlugins(config).filter(({ plugin }: PluginItem) => {
    if (plugin && plugin.constructor) {
      return plugin.constructor.name === name;
    }
    return false;
  });
}

export function isRuleSetItem(loader: RuleSetUse): loader is RuleSetUseItem {
  return typeof loader === 'string' || typeof loader === 'function' || isRuleSetLoader(loader);
}

export function isRuleSetLoader(loader: RuleSetUse): loader is RuleSetLoader {
  return Object.keys(loader).some(k => ['loader', 'options', 'indent', 'query'].includes(k));
}
