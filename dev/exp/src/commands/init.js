import inquirerAsync from 'inquirer-async';
import ProgressBar from 'progress';
import { Api, Exp, Logger, NotificationCode, MessageCode } from 'xdl';

import _ from 'lodash';
import log from '../log';

import path from 'path';

let _currentRequestID = 0;
let _downloadIsSlowPrompt = false;

async function action(projectDir, options) {
  let templateType;
  let questions = [];
  let insertPath = path.dirname(projectDir);
  let name = path.basename(projectDir);

  if (options.clearCache) {
    await Exp.clearXDLCacheAsync();
  }

  if (!insertPath || !name) {
    throw new Error(`Couldn't determine path for new project.`);
  }

  if (options.projectType) {
    templateType = options.projectType;
  } else {
    let versions = await Api.versionsAsync();
    let templateIds = _.map(versions.templates, template => `"${template.id}"`);
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
    if (answers.type) {
      templateType = answers.type;
    }
  }

  // TODO(jim): We will need to update this method later to not force
  // us to strip out the <name> from /path/to/<name> if we don't want
  // to duplicate the folder at creation time. (example: test => test/test)
  downloadAndExtractTemplate(templateType, insertPath, {
    name,
  });
}

async function downloadAndExtractTemplate(
  templateType,
  projectDir,
  validatedOptions
) {
  const requestID = _currentRequestID + 1;
  _currentRequestID = requestID;
  let _progressBar = null;

  let templateDownload = await Exp.downloadTemplateApp(
    templateType,
    projectDir,
    {
      ...validatedOptions,
      progressFunction: (percentage, chunkLength, totalSize) => {
        if (_currentRequestID === requestID) {
          if (!_progressBar) {
            _progressBar = new ProgressBar('[:bar] :percent :etas', {
              width: 50,
              total: totalSize,
              complete: '=',
              incomplete: ' ',
            });
          }

          Logger.notifications.info(
            { code: NotificationCode.DOWNLOAD_CLI_PROGRESS },
            percentage + '%'
          );
          if (!_downloadIsSlowPrompt) {
            _progressBar.tick(chunkLength);
          }
        }
      },
      retryFunction: () => {
        if (_progressBar) {
          _progressBar.interrupt(MessageCode.TEMPLATE_DOWNLOAD_IS_SLOW_EXP);
        }
      },
    }
  );

  // Since we cannot cancel the download request, we need a way to ignore all of the requests made except the last one when retrying.
  if (_currentRequestID !== requestID) {
    return;
  }
  let root = await Exp.extractTemplateApp(
    templateDownload.starterAppPath,
    templateDownload.name,
    templateDownload.root
  );
  log(
    `Your project is ready at ${root}. Use "exp start ${root}" to get started.`
  );
  process.exit();
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
    .option('-c, --clearCache', 'Clears the starter project cache.')
    .allowNonInteractive()
    .asyncActionProjectDir(action, true /* skipProjectValidation */);
};
