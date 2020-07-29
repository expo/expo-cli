const chalk = require('chalk');
const fs = require('fs-extra');

const { copyTemplateToProject, ensureMinProjectSetupAsync } = require('../');
process.on('unhandledRejection', err => {
  throw err;
});

const projectRoot = fs.realpathSync(process.cwd());

console.log();
console.log(chalk.magenta('\u203A Copying Expo Electron main process to local project...'));

copyTemplateToProject(projectRoot);
ensureMinProjectSetupAsync(projectRoot);

console.log(
  chalk.magenta(
    '\u203A You can now edit the Electron main process in the `electron/main` folder of your project...'
  )
);
