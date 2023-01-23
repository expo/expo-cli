import { configFilename, getConfig } from '@expo/config';
import chalk from 'chalk';
import shell from 'shelljs';

import { getSchemaAsync } from './api/getSchemaAsync';
import IllegalPackageCheck from './checks/IllegalPackageCheck';
import SupportPackageVersionCheck from './checks/SupportPackageVersionCheck';
import { validateWithSchemaAsync } from './schema/validate';
import { logNewSection } from './utils/ora';
import { warnUponCmdExe } from './windows';

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = getConfig(projectRoot);

  const checks = [new SupportPackageVersionCheck(), new IllegalPackageCheck()];

  let foundSomeIssues = false;

  const checkParams = { exp, pkg, projectRoot };

  for (const check of checks) {
    console.log(check.description);
    const result = await check.runAsync(checkParams);
    if (!result.isSuccessful) {
      console.log(chalk.red(`✖ Found issues with ${check.description}`));
      for (const issue of result.issues) {
        console.log(chalk.red(`  ${issue}`));
      }
      foundSomeIssues = true;
    }
  }

  // dependency check
  const ora = logNewSection(`Checking versions of installed dependencies...`);
  const originalPwd = shell.pwd().stdout;

  shell.cd(projectRoot);

  const installCheckOutput = shell.exec('echo "n" | npx expo install --check', { silent: true });

  //console.log(chalk.yellow(installCheckOutput.stderr));
  if (installCheckOutput.code !== 0) {
    ora.fail(installCheckOutput.stderr);
    foundSomeIssues = true;
  } else {
    ora.stop();
  }

  shell.cd(originalPwd);

  const schema = await getSchemaAsync(exp.sdkVersion!);

  const configName = configFilename(projectRoot);

  const { schemaErrorMessage, assetsErrorMessage } = await validateWithSchemaAsync(
    projectRoot,
    exp,
    schema,
    configName,
    false
  );

  if (schemaErrorMessage || assetsErrorMessage) {
    console.log(schemaErrorMessage);
    foundSomeIssues = true;
  }

  if (foundSomeIssues) {
    process.exitCode = 1;
  } else {
    console.log(chalk.green(`🎉 Didn't find any issues with the project!`));
  }
}
