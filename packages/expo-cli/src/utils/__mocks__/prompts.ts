import { Choice, Options, PromptObject as Question } from 'prompts';

type PromptOptions = { nonInteractiveHelp?: string } & Options;

type CliQuestions = Question | Question[];

const prompt = jest.fn(
  (questions: CliQuestions, { nonInteractiveHelp }: { nonInteractiveHelp?: string } = {}) => {
    return {};
  }
);

// todo: replace this workaround, its still selectable by the cursor
// see: https://github.com/terkelg/prompts/issues/254
prompt.separator = (title: string): Choice => ({ title, disable: true, value: undefined });

export const selectAsync = jest.fn(
  (questions: any, options?: PromptOptions) => prompt(questions, options).value
);

export const confirmAsync = jest.fn(
  (questions: Question | Question[], options?: PromptOptions) => prompt(questions, options).value
);

export default prompt;
