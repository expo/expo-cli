import inquirerAsync from 'inquirer-async';

import {
  Exp,
} from 'xdl';

import log from '../log';

async function action(projectDir, options) {
  let validatedOptions = {};
  if (options.projectName) {
    validatedOptions.name = options.projectName;
  } else {
    let questions = [{
      type: 'input',
      name: 'name',
      message: 'Project name',
      validate(val) {
        // TODO: Validate
        return val.length > 0;
      },
    }];

    var answers = await inquirerAsync.promptAsync(questions);
    validatedOptions.name = answers.name;
  }

  let root = await Exp.createNewExpAsync(projectDir, {}, validatedOptions);
  log(`Your project is ready at ${root}. Use "exp start ${root}" to get started.`);
}

export default (program) => {
  program
    .command('init [project-dir]')
    .alias('i')
    .description('Initializes a directory with an example project')
    .option('-n, --projectName [name]', 'Specify a name for the new project')
    .asyncActionProjectDir(action);
};
