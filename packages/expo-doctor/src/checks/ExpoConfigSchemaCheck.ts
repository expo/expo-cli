import { configFilename } from '@expo/config';

import { getSchemaAsync } from '../api/getSchemaAsync';
import { validateWithSchemaAsync } from '../schema/validate';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

export default class ExpoConfigSchemaCheck implements DoctorCheck {
  description = 'Validating Expo Config against schema...';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    const schema = await getSchemaAsync(exp.sdkVersion!);

    const configName = configFilename(projectRoot);

    const { schemaErrorMessage, assetsErrorMessage } = await validateWithSchemaAsync(
      projectRoot,
      exp,
      schema,
      configName,
      false
    );

    if (schemaErrorMessage) {
      issues.push(schemaErrorMessage!);
    }
    if (assetsErrorMessage) {
      issues.push(assetsErrorMessage!);
    }

    return {
      isSuccessful: issues.length === 0,
      issues,
    };
  }
}
