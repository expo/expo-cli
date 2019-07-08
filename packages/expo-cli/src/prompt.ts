import program from 'commander';
import get from 'lodash/get';
import inquirer, { Question } from 'inquirer';
export { Question }

import CommandError from './CommandError';

type CliQuestions = Question | Question[];

export default function prompt(questions: CliQuestions, { nonInteractiveHelp }: { nonInteractiveHelp?: boolean } = {}) {
  const nQuestions = Array.isArray(questions) ? questions.length : 1;
  if (program.nonInteractive && nQuestions !== 0) {
    let message = `Input is required, but Expo CLI is in non-interactive mode.\n`;
    if (nonInteractiveHelp) {
      message += nonInteractiveHelp;
    } else {
      const question: any = Array.isArray(questions) ? questions[0] : questions;
      message += `Required input:\n${(question.message || '').trim().replace(/^/gm, '> ')}`;
    }
    throw new CommandError('NON_INTERACTIVE', message);
  }
  return inquirer.prompt(questions);
}

prompt.separator = (...args: any[]) => new inquirer.Separator(...args);
