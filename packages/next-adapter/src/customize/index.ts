import chalk from 'chalk';
// @ts-ignore
import { MultiSelect } from 'enquirer';

import { manifest } from './manifest';

export * from './manifest';

function logReady() {
  console.log();
  console.log(
    chalk.reset(`\u203A Your Expo + Next.js project has all of the required customizations.`)
  );
  console.log(
    chalk.reset(`\u203A Start your project with \`${chalk.bold(`yarn next dev`)}\` to test it.`)
  );
  console.log();
}

// @ts-ignore enquirer has no exported member 'MultiSelect'
async function runNonInteractiveFlowAsync(projectRoot: string): Promise<void> {
  const customizations = manifest.filter(({ type }) => type === 'required');
  for (const customization of customizations) {
    if (customization.onEnabledAsync({ projectRoot, force: false })) {
      await customization.onSelectAsync({ projectRoot, force: true });
    }
  }
  logReady();
}

export async function runAsync({
  projectRoot,
  force,
  yes: nonInteractive,
}: {
  projectRoot: string;
  force: boolean;
  yes: boolean;
}): Promise<void> {
  if (nonInteractive) {
    await runNonInteractiveFlowAsync(projectRoot);
    return;
  }

  const values = [];

  for (const customization of manifest) {
    const enabled = await customization.onEnabledAsync({ projectRoot, force });
    values.push({
      name: customization.name,
      disabled: !force && !enabled ? '✔︎' : false,
      message: force && !enabled ? chalk.red(customization.name) : customization.name,
    });
  }

  if (!values.filter(({ disabled }) => !disabled).length) {
    logReady();
    console.log(
      chalk.dim(`\u203A To regenerate the files run: ${chalk.bold('next-expo --force')}`)
    );
    console.log();
    return;
  }

  const prompt = new MultiSelect({
    hint: '(Use <space> to select, <return> to submit)\n',
    message: `Which Next.js files would you like to generate?\n`,
    limit: values.length,
    choices: values,
  });

  let answer;
  try {
    answer = await prompt.run();
  } catch (error) {
    return;
  }

  await Promise.all(
    answer
      .map((item: any) => {
        const customization = manifest.find(({ name }) => name === item);
        if (customization) return customization.onSelectAsync({ projectRoot, force });
        else throw new Error('failed to find customization matching: ' + item);
      })
      .filter(Boolean)
  );
}
