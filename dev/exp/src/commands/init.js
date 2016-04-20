import {
  Exp,
} from 'xdl';

var log = require('../log');

async function action(projectDir, options) {
  let info = {};
  if (options.name) {
    info.name = options.name;
  }

  await Exp.createNewExpAsync(projectDir, info, {force: true});
  log(`Your project is ready at ${projectDir}. Use "exp start ${projectDir}" to get started.`)
}

module.exports = (program) => {
  program
    .command('init [project-dir]')
    .alias('i')
    .description('Initializes a directory with an example project')
    .option('-n, --name [name]', 'Specify a name for the new project. Otherwise will use the directory name.')
    .asyncActionProjectDir(action);
};
