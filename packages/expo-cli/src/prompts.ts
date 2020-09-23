import program from 'commander';
import prompts, { Choice, Options, PromptType, PromptObject as Question } from 'prompts';

import CommandError from './CommandError';

export { PromptType, Question };

type PromptOptions = { nonInteractiveHelp?: string } & Options;

export default function prompt(
  questions: Question | Question[],
  { nonInteractiveHelp, ...options }: PromptOptions = {}
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

export type NamelessQuestion = Omit<Question<'value'>, 'name' | 'type'>;

/**
 * Create an auto complete list that can be searched and cancelled.
 *
 * @param questions
 * @param options
 */
export async function autoCompleteAsync(
  questions: NamelessQuestion | NamelessQuestion[],
  options?: PromptOptions
): Promise<string> {
  const { value } = await prompt(
    {
      limit: 11,
      suggest(input: any, choices: any) {
        const regex = new RegExp(input, 'i');
        return choices.filter((choice: any) => regex.test(choice.title));
      },
      ...questions,
      name: 'value',
      type: 'autocomplete',
    },
    options
  );
  return value ?? null;
}

/**
 * Create a selection list that can be cancelled.
 *
 * @param questions
 * @param options
 */
export async function selectAsync(
  questions: NamelessQuestion,
  options?: PromptOptions
): Promise<any> {
  const { value } = await prompt(
    {
      limit: 11,
      ...questions,
      name: 'value',
      type: 'select',
    },
    options
  );
  return value ?? null;
}

/**
 * Create a standard yes/no confirmation that can be cancelled.
 *
 * @param questions
 * @param options
 */
export async function confirmAsync(
  questions: NamelessQuestion,
  options?: PromptOptions
): Promise<boolean> {
  const { value } = await prompt(
    {
      initial: true,
      ...questions,
      name: 'value',
      type: 'confirm',
    },
    options
  );
  return value ?? null;
}

/**
 * Create a more dynamic yes/no confirmation that can be cancelled.
 *
 * @param questions
 * @param options
 */
export async function toggleConfirmAsync(
  questions: NamelessQuestion,
  options?: PromptOptions
): Promise<boolean> {
  const { value } = await prompt(
    {
      active: 'yes',
      inactive: 'no',
      ...questions,
      name: 'value',
      type: 'toggle',
    },
    options
  );
  return value ?? null;
}
