import ora from 'ora';
import _ from 'lodash';

import * as consts from './constants';
import log from '../../../../log';
import * as apple from '../apple';

async function generate(appleCtx, credentialsToGenerate, metadata) {
  log(`We're going to generate:`);
  credentialsToGenerate.forEach(_type => {
    log(`- ${consts.CREDENTIALS[_type].name}`);
  });

  let newCredentials = {};
  for (const id of credentialsToGenerate) {
    const { name } = consts.CREDENTIALS[id];
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

async function _create(appleCtx, _type, metadata) {
  const manager = apple.createManagers(appleCtx)[_type];
  return await manager.create(metadata);
}

function determineMissingCredentials(existingCredentials = {}) {
  const existingCredentialsKeys = Object.keys(existingCredentials);
  const missing = consts.REQUIRED_CREDENTIALS.reduce((acc, ruleOrCondition) => {
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
    const { deprecated, name } = applyingRules[0];
    if (deprecated) {
      log.warn(
        `You're using deprecated ${name}. Read our docs to learn how to use more modern solution.`
      );
    }
    return null;
  }
}
const _applyRule = (keys, rule) => (!_doCredentialsExist(keys, rule) ? rule.id : null);

function _doCredentialsExist(keys, rule) {
  const common = _.intersection(keys, rule.required);
  return rule.required.length === common.length;
}

export { generate, determineMissingCredentials };
