import inquirer from 'inquirer';
import ProgressBar from 'progress';
import { Api, Exp, Logger, NotificationCode, MessageCode } from 'xdl';

import _ from 'lodash';
import log from '../log';
import CommandError from '../CommandError';

import path from 'path';

let _currentRequestID = 0;
let _downloadIsSlowPrompt = false;
let _retryObject = {};
let _bar = new ProgressBar('[:bar] :percent', {
  total: 100,
  complete: '=',
  incomplete: ' ',
});

async function action(projectDir, options) {
  let templateType;
  let questions = [];

  let insertPath = path.dirname(projectDir);
  let name = path.basename(projectDir);

  // If the user does not supply a project name, exp prompts the user
  if (projectDir === process.cwd()) {
    questions.push({
      name: 'name',
      message: 'Choose a project name:',
      validate(input) {
        return /^[a-z0-9@.' '\-\_]*$/i.test(input) && input.length > 0;
      },
    });
  }

  if (options.projectType) {
    templateType = options.projectType;
  } else {
    let versions = await Api.versionsAsync();
    let templateIds = _.map(versions.templatesv2, template => template.id);

    questions.push({
      type: 'list',
      name: 'type',
      message: 'Choose a template type:',
      choices: templateIds,
    });
  }

  if (questions.length > 0) {
    var answers = await inquirer.prompt(questions);
    if (answers.name) {
      // If the user supplies a project name, change the insertPath and name
      insertPath = projectDir;
      name = answers.name;
    }
    if (answers.type) {
      templateType = answers.type;
    }
  }

  if (!insertPath || !name) {
    throw new CommandError('PATH_ERROR', `Couldn't determine path for new project.`);
  }

  // TODO(jim): We will need to update this method later to not force
  // us to strip out the <name> from /path/to/<name> if we don't want
  // to duplicate the folder at creation time. (example: test => test/test)
  await downloadAndExtractTemplate(templateType, insertPath, {
    name,
  });
}

async function downloadAndExtractTemplate(templateType, projectDir, validatedOptions) {
  _retryObject = { templateType, projectDir, validatedOptions };
  const requestID = _currentRequestID + 1;
  _currentRequestID = requestID;

  let templateDownload = await Exp.downloadTemplateApp(templateType, projectDir, {
    ...validatedOptions,
    progressFunction: progress => {
      if (_currentRequestID === requestID) {
        Logger.notifications.info({ code: NotificationCode.DOWNLOAD_CLI_PROGRESS }, progress + '%');
        if (!_downloadIsSlowPrompt) {
          _bar.tick();
        }
      }
    },
    retryFunction: () => {
      triggerRetryPrompt();
    },
  });

  // Since we cannot cancel the download request, we need a way to ignore all of the requests made except the last one when retrying.
  if (_currentRequestID !== requestID) {
    return;
  }
  let root = await Exp.extractTemplateApp(
    templateDownload.starterAppPath,
    templateDownload.name,
    templateDownload.root
  );
  log(`Your project is ready at ${root}. Use "exp start ${root}" to get started.`);
  process.exit();
}

async function triggerRetryPrompt() {
  _downloadIsSlowPrompt = true;
  var answer = await inquirer.prompt({
    type: 'input',
    name: 'retry',
    message: '\n' + MessageCode.DOWNLOAD_IS_SLOW + '(y/n)',
    validate(val) {
      if (val !== 'y' && val !== 'n') {
        return false;
      }
      return true;
    },
  });

  if (answer.retry === 'n') {
    _downloadIsSlowPrompt = false;
  } else {
    Exp.clearXDLCacheAsync();
    _downloadIsSlowPrompt = false;
    downloadAndExtractTemplate(
      _retryObject.templateType,
      _retryObject.projectDir,
      _retryObject.validatedOptions
    );
  }
}

export default program => {
  program
    .command('init [project-dir]')
    .alias('i')
    .description(
      'Initializes a directory with an example project. Run it without any options and you will be prompted for the name and type.'
    )
    .option(
      '-t, --projectType [type]',
      'Specify what type of template to use. Run without this option to see all choices.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir(action, true /* skipProjectValidation */);
};
