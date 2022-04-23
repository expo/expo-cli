import chalk from 'chalk';
import prompts from 'prompts';

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

async function runNonInteractiveFlowAsync(projectRoot: string): Promise<void> {
  const customizations = manifest.filter(({ type }) => type === 'required');
  for (const customization of customizations) {
    if (await customization.onEnabledAsync({ projectRoot, force: false })) {
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
      title: customization.name,
      value: customization.name,
      // @ts-ignore: broken types
      disabled: !force && !enabled,
      message: force && !enabled ? chalk.red('This will overwrite the existing file') : '',
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

  const { answer } = await prompts({
    type: 'multiselect',
    name: 'answer',
    message: 'Which Next.js files would you like to generate?\n',
    hint: '- Space to select. Return to submit',
    // @ts-ignore: broken types
    warn: 'File exists, use --force to overwrite it.',
    limit: values.length,
    instructions: '',
    choices: values,
  });

  if (!answer) {
    console.log('\n\u203A Exiting...\n');
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
