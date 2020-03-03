import ora from 'ora';
import chalk from 'chalk';
import intersection from 'lodash/intersection';

import * as constants from './constants';
import log from '../../../../log';
import * as apple from '../../../../appleApi';

type Metadata = Record<string, any>;

export async function generate(
  appleCtx: apple.AppleCtx,
  credentialsToGenerate: ('distributionCert' | 'pushKey' | 'provisioningProfile')[],
  metadata: Metadata,
  projectMetadata: Metadata
): Promise<Partial<apple.ProvisioningProfile>> {
  if (!credentialsToGenerate || credentialsToGenerate.length === 0) {
    return {};
  }

  await apple.ensureAppExists(
    appleCtx,
    {
      experienceName: projectMetadata.experienceName,
      bundleIdentifier: projectMetadata.bundleIdentifier,
    },
    { enablePushNotifications: true }
  );

  log(`We're going to generate:`);
  credentialsToGenerate.forEach(type => {
    log(`- ${constants.CREDENTIALS[type].name}`);
  });

  let newCredentials: Partial<apple.ProvisioningProfile> = {};
  for (const id of credentialsToGenerate) {
    const { name } = constants.CREDENTIALS[id];
    const spinner = ora(`Generating ${name}...`).start();
    try {
      const generated = await _create(appleCtx, id, metadata, projectMetadata);
      spinner.succeed(`Generated ${name}`);
      newCredentials = { ...newCredentials, ...generated };
    } catch (err) {
      spinner.fail(`Failed to generate ${name}`);
      throw err;
    }
  }
  return newCredentials;
}

async function _create(
  appleCtx: apple.AppleCtx,
  type: 'distributionCert' | 'pushKey' | 'provisioningProfile',
  metadata: Metadata,
  projectMetadata: Metadata
): Promise<apple.ProvisioningProfile | apple.DistCert | apple.PushKey> {
  const manager = apple.createManagers(appleCtx)[type];
  if (manager instanceof apple.ProvisioningProfileManager) {
    const { bundleIdentifier } = projectMetadata;
    return await manager.create(bundleIdentifier, metadata);
  }

  return await manager.create();
}

export function determineMissingCredentials(
  existingCredentials: Record<string, any> = {}
): null | string[] {
  const existingCredentialsKeys = Object.keys(existingCredentials);
  const missing = constants.REQUIRED_CREDENTIALS.reduce(
    (acc, ruleOrCondition) => {
      const id = _applyRuleOrCondition(existingCredentialsKeys, ruleOrCondition);
      if (id) {
        acc.push(id);
      }
      return acc;
    },
    [] as string[]
  );
  return missing.length === 0 ? null : missing;
}

function _applyRuleOrCondition(
  keys: string[],
  ruleOrCondition: constants.Rule | constants.Condition
): string | null | undefined {
  if ('or' in ruleOrCondition) {
    return _applyOrCondition(keys, ruleOrCondition.or);
  }
  return _applyRule(keys, ruleOrCondition);
}

function _applyOrCondition(keys: string[], condition: constants.Rule[]): string | null | undefined {
  const applyingRules = condition.filter(rule => _doCredentialsExist(keys, rule));
  if (applyingRules.length === 0) {
    const notDeprecatedRule = condition.find(rule => !rule.deprecated);
    // @ts-ignore
    return notDeprecatedRule.id;
  } else if (applyingRules.length === 1) {
    const { deprecated, name, migrationDocs } = applyingRules[0];
    if (deprecated) {
      log.warn(
        `You're using deprecated ${name}. Read our docs to learn how to use more modern solution. ${migrationDocs
          ? chalk.underline(migrationDocs)
          : ''}`
      );
    }
    return null;
  }
  return undefined;
}

const _applyRule = (keys: string[], rule: constants.Rule): string | null =>
  !_doCredentialsExist(keys, rule) ? rule.id : null;

function _doCredentialsExist(keys: string[], rule: constants.Rule): boolean {
  const common = intersection(keys, rule.required);
  return rule.required.length === common.length;
}
