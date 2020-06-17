import program from 'commander';
import prompts, { Choice, PromptObject, PromptType } from 'prompts';

import CommandError from './CommandError';

export { PromptType, PromptObject };

type CliPrompts = PromptObject | PromptObject[];

export default function prompt(
  questions: Question | Question[],
  { nonInteractiveHelp }: { nonInteractiveHelp?: string } = {}
) {
  questions = Array.isArray(questions) ? questions : [questions];
  if (program.nonInteractive && nPrompts !== 0) {
    let message = `Input is required, but Expo CLI is in non-interactive mode.\n`;
    if (nonInteractiveHelp) {
      message += nonInteractiveHelp;
    } else {
      const question = questions[0];
      message += `Required input:\n${(question.message || '').trim().replace(/^/gm, '> ')}`;
    }
    throw new CommandError('NON_INTERACTIVE', message);
  }
  return prompts(cliPrompts, {
    onCancel() {
      throw new CommandError('ABORTED');
    },
  });
}

// todo: replace this workaround, its still selectable by the cursor
// see: https://github.com/terkelg/prompts/issues/254
prompt.separator = (title: string): Choice => ({ title, disable: true, value: undefined });
