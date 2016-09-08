import inquirerAsync from 'inquirer-async';

import {
  Exp,
} from 'xdl';

import log from '../log';

async function action(projectDir, options) {
  let questions = [
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name',
      validate(val) {
        return val.length > 0;
      },
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'A short description of your project (optional)',
    },
    {
      type: 'input',
      name: 'projectEntryPoint',
      message: 'Your project entry point',
      default: 'index.*.js',
    },
  ];

  var answers = await inquirerAsync.promptAsync(questions);
  let root = await Exp.convertProjectAsync(projectDir, answers);
  // log(`Your project is ready at ${root}. Use "exp start ${root}" to get started.`);
}

export default (program) => {
  program
    .command('convert [project-dir]')
    .alias('onentize')
    .description('Initialize Exponent project files within an existing React Native project')
    .asyncActionProjectDir(action);
};
