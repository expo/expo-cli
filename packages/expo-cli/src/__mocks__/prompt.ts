import inquirer, { Question } from 'inquirer';

type CliQuestions = Question | Question[];

function prompt(
  questions: CliQuestions,
  { nonInteractiveHelp }: { nonInteractiveHelp?: string } = {}
) {
  return {};
}

prompt.separator = (...args: any[]) => new inquirer.Separator(...args);

export default jest.fn(prompt);
