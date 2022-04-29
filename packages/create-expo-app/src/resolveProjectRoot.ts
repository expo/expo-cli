import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

import * as Template from './Template';
import { getConflictsForDirectory } from './dir';
import { formatSelfCommand } from './resolvePackageManager';

export function assertValidName(folderName: string) {
  const validation = Template.validateName(folderName);
  if (typeof validation === 'string') {
    console.error(chalk.red(`Cannot create an app named {red "${folderName}"}. ${validation}`));
    process.exit(1);
  }
}

export function assertFolderEmpty(projectRoot: string, folderName: string) {
  const conflicts = getConflictsForDirectory(projectRoot);
  if (conflicts.length) {
    console.log(`The directory {cyan ${folderName}} has files that might be overwritten:`);
    console.log();
    for (const file of conflicts) {
      console.log(`  ${file}`);
    }
    console.log();
    console.log('Try using a new directory name, or moving these files.');
    console.log();
    process.exit(1);
  }
}

export async function resolveProjectRootAsync(input: string): Promise<string> {
  let name = input?.trim();

  if (!name) {
    const { answer } = await prompts({
      type: 'text',
      name: 'answer',
      message: 'What is your app named?',
      initial: 'my-app',
      validate: name => {
        const validation = Template.validateName(path.basename(path.resolve(name)));
        if (typeof validation === 'string') {
          return 'Invalid project name: ' + validation;
        }
        return true;
      },
    });

    if (typeof answer === 'string') {
      name = answer.trim();
    }
  }

  if (!name) {
    const selfCmd = formatSelfCommand();
    console.log();
    console.log('Please choose your app name:');
    console.log(chalk`  {dim $} {cyan ${selfCmd} <name>}`);
    console.log();
    console.log(`For more info, run:`);
    console.log(chalk`  {dim $} {cyan ${selfCmd} --help}`);
    console.log();
    process.exit(1);
  }

  const projectRoot = path.resolve(name);
  const folderName = path.basename(projectRoot);

  assertValidName(folderName);

  await fs.promises.mkdir(projectRoot, { recursive: true });

  assertFolderEmpty(projectRoot, folderName);

  return projectRoot;
}
