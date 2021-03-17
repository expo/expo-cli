import chalk from 'chalk';
import { execSync } from 'child_process';
import checkForUpdate from 'update-check';

function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export default async function shouldUpdate() {
  const packageJson = () => require('../package.json');

  const update = checkForUpdate(packageJson()).catch(() => null);

  try {
    const res = await update;
    if (res && res.latest) {
      const isYarn = shouldUseYarn();

      const _packageJson = packageJson();
      console.log();
      console.log(chalk.yellow.bold(`A new version of \`${_packageJson.name}\` is available`));
      console.log(
        'You can update by running: ' +
          chalk.cyan(
            isYarn ? `yarn global add ${_packageJson.name}` : `npm i -g ${_packageJson.name}`
          )
      );
      console.log();
    }
  } catch {
    // ignore error
  }
}
