import program from 'commander';
import inquirer, { ChoiceType, Question } from 'inquirer';

import CommandError from './CommandError';
export { Question, ChoiceType };

type CliQuestions = Question | Question[];

/** @deprecated this prompt is now deprecated in favor of ./prompts */
export default function prompt(
  questions: CliQuestions,
  { nonInteractiveHelp }: { nonInteractiveHelp?: string } = {}
) {
  questions = Array.isArray(questions) ? questions : [questions];
  const nAllQuestions = questions.length;
  if (program.nonInteractive) {
    const nQuestionsToAsk = questions.filter(question => {
      if (!('when' in question)) {
        return true;
      } else if (typeof question.when === 'function') {
        // if `when` is a function it takes object containing previous answers as argument
        // in this case we want to detect if any question will be asked, so it
        // always will be empty object
        return question.when({});
      } else {
        return question.when;
      }
    }).length;
    if (nAllQuestions === 0 || nQuestionsToAsk === 0) {
      return {} as any;
    }
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
