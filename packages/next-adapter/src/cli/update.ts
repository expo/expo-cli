import chalk from 'chalk';
import checkForUpdate from 'update-check';

const packageJson = () => require('@expo/next-adapter/package.json');

export default async function shouldUpdate() {
  const update = checkForUpdate(packageJson()).catch(() => null);

  try {
    const res = await update;
    if (res && res.latest) {
      const _packageJson = packageJson();
      console.log();
      console.log(chalk.yellow.bold(`A new version of \`${_packageJson.name}\` is available`));
      console.log('You can update by running: ' + chalk.cyan(`npm i -g ${_packageJson.name}`));
      console.log();
    }
  } catch {
    // ignore error
  }
}
