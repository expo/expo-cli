import program from 'commander';
import inquirer from 'inquirer';

import CommandError from './CommandError';

export default function prompt(questions, { nonInteractiveHelp } = {}) {
  if (program.nonInteractive && questions.length !== 0) {
    let message = `Input is required, but Expo CLI is in non-interactive mode.\n`;
    if (nonInteractiveHelp) {
      message += nonInteractiveHelp;
    } else {
      let question = Array.isArray(questions) ? questions[0] : questions;
      message += `Required input:\n${question.message.trim().replace(/^/gm, '> ')}`;
    }
    throw new CommandError('NON_INTERACTIVE', message);
  }
  return inquirer.prompt(questions);
}
