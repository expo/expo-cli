const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

process.on('unhandledRejection', err => {
  throw err;
});

const projectRoot = fs.realpathSync(process.cwd());

console.log();
console.log(chalk.magenta('\u203A Copying Expo Electron main process to local project...'));

fs.copy(path.join(__dirname, '../template/'), path.join(projectRoot, 'electron'));
