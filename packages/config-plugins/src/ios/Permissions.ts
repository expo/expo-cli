import { ConfigPlugin } from '../Plugin.types';
import { withInfoPlist } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

/**
 * Apply permissions and their respective descriptions to the iOS Info.plist.
 * Providing a null description will remove the permission from the Info.plist.
 *
 * @param config
 * @param permissions record of strings where the key matches Info.plist permissions and the values are the permission descriptions.
 */
export const withPermissions: ConfigPlugin<Record<string, string | null>> = (
  config,
  permissions
) => {
  return withInfoPlist(config, async config => {
    config.modResults = applyPermissions(permissions, config.modResults);
    return config;
  });
};

export function applyPermissions(
  permissions: Record<string, string | null>,
  infoPlist: Record<string, any>
): InfoPlist {
  const entries = Object.entries(permissions);
  if (entries.length === 0) {
    // TODO: Debug warn
    // console.warn('[withPermissions] no permissions were provided');
  }
  for (const [permission, description] of entries) {
    if (description == null) {
      delete infoPlist[permission];
    } else {
      const existingPermission = infoPlist[permission];
      if (existingPermission && existingPermission !== description) {
        // TODO: Debug warn
        //   console.warn(
        //     `[withPermissionsIos][conflict] permission "${permission}" is already defined in the Info.plist with description "${existingPermission}"`
        //   );
      }
      infoPlist[permission] = description;
    }
  }
  return infoPlist;
}
