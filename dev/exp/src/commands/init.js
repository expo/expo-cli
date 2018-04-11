import fs from 'fs';
import chalk from 'chalk';
import ProgressBar from 'progress';
import { Api, Exp, Logger, NotificationCode, MessageCode } from 'xdl';
import wordwrap from 'wordwrap';

import prompt from '../prompt';
import log from '../log';
import CommandError from '../CommandError';

import path from 'path';

let _downloadIsSlowPrompt = false;

async function action(projectDir, options) {
  let parentDir;
  let name;

  // No `await` here, just start fetching versions in the background and block later.
  let versionsPromise = Api.versionsAsync();

  if (projectDir) {
    let root = path.resolve(projectDir);
    parentDir = path.dirname(root);
    name = path.basename(root);
    let validationResult = validateName(parentDir, name);
    if (validationResult !== true) {
      throw new CommandError('INVALID_PROJECT_DIR', validationResult);
    }
  } else {
    parentDir = process.cwd();
    ({ name } = await prompt({
      name: 'name',
      message: 'Choose a project name:',
      filter: name => name.trim(),
      validate: name => validateName(parentDir, name),
    }));
  }

  let templateId;
  if (options.template) {
    templateId = options.template;
  } else {
    let versions = await versionsPromise;
    let wrap = wordwrap(2, process.stdout.columns || 80);
    ({ templateId } = await prompt({
      type: 'list',
      name: 'templateId',
      message: 'Choose a template:',
      choices: versions.templatesv2.map(template => ({
        value: template.id,
        name: chalk.bold(template.id) + '\n' + wrap(template.description),
        short: template.id,
      })),
    }));
  }
  let projectPath = await downloadAndExtractTemplate(templateId, parentDir, name);
  let cdPath = path.relative(process.cwd(), projectPath);
  if (cdPath.length > projectPath.length) {
    cdPath = projectPath;
  }
  log.nested(`\nYour project is ready at ${projectPath}`);
  log.nested(`To get started, you can type:\n`)
  if (cdPath) {  // empty string if project was created in current directory
    log.nested(`  cd ${cdPath}`);
  }
  log.nested(`  ${options.parent.name} start\n`);
}

async function downloadAndExtractTemplate(templateId, parentDir, name) {
  let bar = new ProgressBar('[:bar] :percent', {
    total: 100,
    width: 50,
    clear: true,
    complete: '=',
    incomplete: ' ',
  });
  let showProgress = true;
  let opts = {
    name,
    progressFunction: progress => {
      Logger.notifications.info({ code: NotificationCode.DOWNLOAD_CLI_PROGRESS }, progress + '%');
      if (showProgress) {
        bar.update(progress / 100);
      }
    },
    retryFunction: async cancel => {
      bar.terminate();
      showProgress = false;
      let { shouldRestart } = await prompt({
        type: 'confirm',
        name: 'shouldRestart',
        message: MessageCode.DOWNLOAD_IS_SLOW,
      });
      if (shouldRestart) {
        cancel();
      } else {
        showProgress = true;
      }
    },
  };
  try {
    let templateDownload = await Exp.downloadTemplateApp(templateId, parentDir, opts);
    return Exp.extractTemplateApp(
      templateDownload.starterAppPath,
      templateDownload.name,
      templateDownload.root
    );
  } catch (error) {
    if (error.__CANCEL__) {
      log('Download was canceled. Starting again...');
      return downloadAndExtractTemplate(templateId, parentDir, name);
    } else {
      throw error;
    }
  }
}

function validateName(parentDir, name) {
  if (!/^[a-z0-9@.\-_]+$/i.test(name)) {
    return 'The project name can only contain URL-friendly characters.';
  }
  let dir = path.join(parentDir, name);
  if (!isNonExistentOrEmptyDir(dir)) {
    return `The path "${dir}" already exists.\nPlease choose a different parent directory or project name.`;
  }
  return true;
}

function isNonExistentOrEmptyDir(dir) {
  try {
    return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length === 0;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return true;
    }
    throw error;
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
      '-t, --template [name]',
      'Specify which template to use. Run without this option to see all choices.'
    )
    .asyncAction(action);
};
