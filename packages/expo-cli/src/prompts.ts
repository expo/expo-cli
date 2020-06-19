import program from 'commander';
import prompts, { Choice, Options, PromptType, PromptObject as Question } from 'prompts';

import CommandError from './CommandError';

export { PromptType, Question };

export default function prompt(
  questions: Question | Question[],
  { nonInteractiveHelp, ...options }: { nonInteractiveHelp?: string } & Options = {}
) {
  questions = Array.isArray(questions) ? questions : [questions];
  if (program.nonInteractive && questions.length !== 0) {
    let message = `Input is required, but Expo CLI is in non-interactive mode.\n`;
    if (nonInteractiveHelp) {
      message += nonInteractiveHelp;
    } else {
      const question = questions[0];
      const questionMessage =
        typeof question.message === 'function'
          ? question.message(undefined, {}, question)
          : question.message;

      message += `Required input:\n${(questionMessage || '').trim().replace(/^/gm, '> ')}`;
    }
    throw new CommandError('NON_INTERACTIVE', message);
  }
  return prompts(questions, {
    onCancel() {
      throw new CommandError('ABORTED');
    },
    ...options,
  });
}

// todo: replace this workaround, its still selectable by the cursor
// see: https://github.com/terkelg/prompts/issues/254
prompt.separator = (title: string): Choice => ({ title, disable: true, value: undefined });

/**
 * Expose inject method to answering questions programatically, for testing purposes.
 * @see https://github.com/terkelg/prompts#injectvalues
 */
prompt.inject = prompts.inject;
