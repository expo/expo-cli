import JsonFile from '@expo/json-file';

import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export class ExpoConfigCommonIssueCheck implements DoctorCheck {
  description = 'Check Expo config for common issues';

  sdkVersionRange = '*';

  async runAsync({ exp }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    // check if SDK version is in Expo config
    // exp object derives sdkVersion from expo.sdkVersion or installed version, so it will always be populated.
    // Therefore, we need to check app.json file itself to see if this value is defined.
    // Unlikely we can also check a dynamic config unless we change @expo/config.
    const staticConfigPath = exp?._internal?.staticConfigPath;

    // exp provides an empty object if there is no static config
    if (staticConfigPath && typeof staticConfigPath === 'string') {
      const appJson = await JsonFile.readAsync(staticConfigPath);
      if ((appJson as any).expo?.sdkVersion) {
        issues.push(
          'expo.sdkVersion should not be defined in app.json. SDK version is determined by the version of the expo package installed in your project.'
        );
      }
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
