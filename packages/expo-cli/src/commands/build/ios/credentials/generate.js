import ora from 'ora';
import chalk from 'chalk';
import intersection from 'lodash/intersection';

import * as constants from './constants';
import log from '../../../../log';
import * as apple from '../appleApi';

async function generate(appleCtx, credentialsToGenerate, metadata) {
  if (!credentialsToGenerate || credentialsToGenerate.length === 0) {
    return {};
  }

  log(`We're going to generate:`);
  credentialsToGenerate.forEach(type => {
    log(`- ${constants.CREDENTIALS[type].name}`);
  });

  let newCredentials = {};
  for (const id of credentialsToGenerate) {
    const { name } = constants.CREDENTIALS[id];
    const spinner = ora(`Generating ${name}...`).start();
    try {
      const generated = await _create(appleCtx, id, metadata);
      spinner.succeed(`Generated ${name}`);
      newCredentials = { ...newCredentials, ...generated };
    } catch (err) {
      spinner.fail(`Failed to generate ${name}`);
      throw err;
    }
  }
  return newCredentials;
}

async function _create(appleCtx, type, metadata) {
  const manager = apple.createManagers(appleCtx)[type];
  return await manager.create(metadata);
}

function determineMissingCredentials(existingCredentials = {}) {
  const existingCredentialsKeys = Object.keys(existingCredentials);
  const missing = constants.REQUIRED_CREDENTIALS.reduce((acc, ruleOrCondition) => {
    const id = _applyRuleOrCondition(existingCredentialsKeys, ruleOrCondition);
    if (id) {
      acc.push(id);
    }
    return acc;
  }, []);
  return missing.length === 0 ? null : missing;
}

function _applyRuleOrCondition(keys, ruleOrCondition) {
  if ('or' in ruleOrCondition) {
    return _applyOrCondition(keys, ruleOrCondition.or);
  } else {
    return _applyRule(keys, ruleOrCondition);
  }
}

function _applyOrCondition(keys, condition) {
  const applyingRules = condition.filter(rule => _doCredentialsExist(keys, rule));
  if (applyingRules.length === 0) {
    const notDeprecatedRule = condition.find(rule => !rule.deprecated);
    return notDeprecatedRule.id;
  } else if (applyingRules.length === 1) {
    const { deprecated, name, migrationDocs } = applyingRules[0];
    if (deprecated) {
      log.warn(
        `You're using deprecated ${name}. Read our docs to learn how to use more modern solution. ${
          migrationDocs ? chalk.underline(migrationDocs) : ''
        }`
      );
    }
    return null;
  }
}
const _applyRule = (keys, rule) => (!_doCredentialsExist(keys, rule) ? rule.id : null);

function _doCredentialsExist(keys, rule) {
  const common = intersection(keys, rule.required);
  return rule.required.length === common.length;
}

export { generate, determineMissingCredentials };
