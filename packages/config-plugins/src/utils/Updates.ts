import { ExpoConfig } from '@expo/config-types';

export type ExpoConfigUpdates = Pick<
  ExpoConfig,
  'sdkVersion' | 'owner' | 'runtimeVersion' | 'updates' | 'slug'
>;

export function getUpdateUrl(
  config: Pick<ExpoConfigUpdates, 'owner' | 'slug' | 'updates'>,
  username: string | null
): string | null {
  if (config.updates?.url) {
    return config.updates?.url;
  }

  const user = typeof config.owner === 'string' ? config.owner : username;
  if (!user) {
    return null;
  }
  return `https://exp.host/@${user}/${config.slug}`;
}
