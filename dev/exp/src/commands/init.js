import inquirerAsync from 'inquirer-async';

import {
  Api,
  Exp,
} from 'xdl';

import _ from 'lodash';
import log from '../log';

async function action(projectDir, options) {
  let validatedOptions = {};
  let templateType;
  let questions = [];

  if (options.projectName) {
    validatedOptions.name = options.projectName;
  } else {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Project name',
      validate(val) {
        // TODO: Validate
        return val.length > 0;
      },
    });
  }

  if (options.projectType) {
    templateType = options.projectType;
  } else {
    let versions = await Api.versionsAsync();
    let templateIds = _.map(versions.templates, (template) => `"${template.id}"`);

    questions.push({
      type: 'input',
      name: 'type',
      message: `Project type. Options are: ${templateIds.join(', ')}`,
      validate(val) {
        for (let i = 0; i < versions.templates.length; i++) {
          if (versions.templates[i].id === val) {
            return true;
          }
        }

        return false;
      },
    });
  }

  if (questions.length > 0) {
    var answers = await inquirerAsync.promptAsync(questions);
    if (answers.name) {
      validatedOptions.name = answers.name;
    }
    if (answers.type) {
      templateType = answers.type;
    }
  }

  let root = await Exp.createNewExpAsync(templateType, projectDir, {}, validatedOptions);
  log(`Your project is ready at ${root}. Use "exp start ${root}" to get started.`);
  process.exit();
}

export default (program) => {
  program
    .command('init [project-dir]')
    .alias('i')
    .description('Initializes a directory with an example project. Run it without any options and you will be prompted for the name and type.')
    .option('-n, --projectName [name]', 'Specify a name for the new project')
    .option('-t, --projectType [type]', 'Specify what type of template to use. Run without this option to see all choices.')
    .allowNonInteractive()
    .asyncActionProjectDir(action, true); // pass true to skip validation
};
