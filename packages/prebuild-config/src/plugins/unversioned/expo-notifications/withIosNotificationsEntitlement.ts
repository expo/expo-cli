import { ConfigPlugin, withEntitlementsPlist } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import path from 'path';
import resolveFrom from 'resolve-from';

const debug = require('debug')('expo:prebuild-config:expo-notifications') as typeof console.log;

export function isExpoNotificationsInstalled(projectRoot: string): string | null {
  const resolved = resolveFrom.silent(projectRoot, 'expo-notifications/package.json');
  return resolved ? path.dirname(resolved) : null;
}

function isExpoNotificationsAutolinked(config: Pick<ExpoConfig, '_internal'>): boolean {
  // TODO: Detect autolinking
  return true;
}

export const withIosNotificationsEntitlement: ConfigPlugin<'production' | 'development' | void> = (
  config,
  mode
) => {
  return withEntitlementsPlist(config, config => {
    const shouldAdd =
      isExpoNotificationsAutolinked(config) &&
      !!isExpoNotificationsInstalled(config._internal!.projectRoot);
    if (!shouldAdd) {
      debug('Skipping iOS aps-environment entitlement');
      return config;
    }
    config.modResults['aps-environment'] = mode || 'development';
    return config;
  });
};
