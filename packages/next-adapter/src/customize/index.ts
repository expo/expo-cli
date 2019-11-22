import { projectHasModule } from '@expo/config';
import chalk from 'chalk';
// @ts-ignore
import { MultiSelect } from 'enquirer';
// @ts-ignore
import * as PackageManager from 'expo-cli/build/PackageManager';
import fs from 'fs-extra';
import path from 'path';

type SelectMethod = (context: { projectRoot: string; force: boolean }) => Promise<void>;
type EnabledMethod = (context: { projectRoot: string; force: boolean }) => Promise<boolean>;

type CustomizeOption = {
  name: string;
  type: 'custom' | 'required' | 'extra';
  destinationPath: (projectRoot: string) => string;
  templatePath?: string;
  description: string;
  onSelectAsync: SelectMethod;
  onEnabledAsync: EnabledMethod;
};

async function copyFileAsync(from: string, to: string, force: boolean): Promise<void> {
  if (!force && (await fs.pathExists(to))) {
    throw new Error(`Cannot overwrite file at "${to}" without the \`force\` option`);
  }
  if (await fs.pathExists(from)) {
    await fs.copy(from, to, { overwrite: true, recursive: true });
  } else {
    throw new Error(`Expected template file for ${from} doesn't exist at path: ${to}`);
  }
}

const packageRoot = path.join(__dirname, '../../');

export const manifest: CustomizeOption[] = [
  {
    name: 'Install Next.js and Expo adapter',
    type: 'required',
    destinationPath: (projectRoot: string) => '',
    description: 'Ensure your project has all of the required dependencies',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      return true;
    },
    async onSelectAsync({ projectRoot }): Promise<void> {
      const dependencies = ['react-native-web', '@expo/next-adapter', 'next'].filter(
        dependency => !projectHasModule(dependency, projectRoot, {})
      );
      const devDependencies = ['babel-preset-expo'].filter(
        dependency => !projectHasModule(dependency, projectRoot, {})
      );

      const all = [...dependencies, ...devDependencies];
      if (!all.length) {
        console.log(
          chalk.magenta.dim(`\u203A All of the required dependencies are installed already`)
        );
        return;
      } else {
        console.log(chalk.magenta(`\u203A Installing the missing dependencies: ${all.join(', ')}`));
      }

      const packageManager = PackageManager.createForProject(projectRoot);

      await Promise.all([
        packageManager.addAsync(...dependencies),
        packageManager.addDevAsync(...devDependencies),
      ]);
    },
  },
  {
    name: 'pages/index.js',
    type: 'required',
    destinationPath: projectRoot => path.resolve(projectRoot, './pages/index.js'),
    templatePath: path.resolve(packageRoot, 'template/pages/index.js'),
    description: 'the first page for your Next.js project.',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);
      return !(await fs.existsSync(destinationPath));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));

      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force);
    },
  },
  {
    name: 'pages/_document.js',
    type: 'required',
    destinationPath: projectRoot => path.resolve(projectRoot, './pages/_document.js'),
    templatePath: path.resolve(packageRoot, 'template/pages/_document.js'),
    description: 'a custom Next.js Document that ensures CSS-in-JS styles are setup.',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);
      return !(await fs.existsSync(destinationPath));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force);
    },
  },
  {
    name: 'babel.config.js',
    type: 'required',
    destinationPath: projectRoot => path.resolve(projectRoot, './babel.config.js'),
    templatePath: path.resolve(packageRoot, 'template/babel.config.js'),
    description: 'a universal Babel preset for loading projects in iOS, Android, and Next.js.',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);

      if (!(await fs.pathExists(destinationPath))) {
        return true;
      }

      const contents = fs.readFileSync(destinationPath, 'utf8');

      return !contents.includes('// @generated: @expo/next-adapter');
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      // TODO: Bacon: Handle the fact that this file will probably exist
      await copyFileAsync(this.templatePath!, destinationPath, force);
    },
  },
  {
    name: 'next.config.js',
    type: 'required',
    destinationPath: projectRoot => path.resolve(projectRoot, './next.config.js'),
    templatePath: path.resolve(packageRoot, 'template/next.config.js'),
    description: 'the Next.js config with Expo support.',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);
      return !(await fs.existsSync(destinationPath));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force);
    },
  },
  {
    name: 'service-worker.js',
    type: 'extra',
    destinationPath: projectRoot => path.resolve(projectRoot, './public/service-worker.js'),
    templatePath: path.resolve(packageRoot, 'template/service-worker.js'),
    description: 'a service worker with Expo push notification support (works with next-offline).',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);
      return !(await fs.existsSync(destinationPath));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force);
    },
  },
  {
    name: 'server.js',
    type: 'extra',
    destinationPath: projectRoot => path.resolve(projectRoot, './server.js'),
    templatePath: path.resolve(packageRoot, 'template/server.js'),
    description: 'a custom server for handling requests.',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);
      return !(await fs.existsSync(destinationPath));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force);
    },
  },
  {
    name: 'Update git ignore',
    type: 'extra',
    destinationPath: projectRoot => path.resolve(projectRoot, './.gitignore'),
    templatePath: path.resolve(packageRoot, 'template/default-gitignore'),
    description: 'Ensure Next.js and Expo generated folders are ignored in .gitignore',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);

      if (!(await fs.pathExists(destinationPath))) {
        return true;
      }

      const contents = fs.readFileSync(destinationPath, 'utf8');

      return !contents.includes('# @generated: expo/next-adapter');
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      const destinationPath = this.destinationPath(projectRoot);

      if (!(await fs.pathExists(destinationPath))) {
        console.log(
          chalk.magenta(
            `\u203A Creating a default .gitignore for a universal Expo project with Next.js support`
          )
        );
        await copyFileAsync(this.templatePath!, destinationPath, true);
        return;
      }

      let contents = fs.readFileSync(destinationPath, 'utf8');

      if (contents.includes('# @generated: expo/next-adapter')) {
        console.warn(
          chalk.yellow('The .gitignore already appears to contain expo generated files')
        );
        return;
      }

      console.log(chalk.magenta(`\u203A Adding the generated folders to your .gitignore`));

      contents += `\n# @generated: expo/next-adapter\n.expo/*\n.next/*\n`;
      await fs.writeFile(destinationPath, contents);
    },
  },
];

// @ts-ignore enquirer has no exported member 'MultiSelect'
async function runNonInteractiveFlowAsync(projectRoot: string): Promise<void> {
  const customizations = manifest.filter(({ type }) => type === 'required');
  const promises: Promise<void>[] = [];
  for (const customization of customizations) {
    if (customization.onEnabledAsync({ projectRoot, force: false })) {
      promises.push(customization.onSelectAsync({ projectRoot, force: true }));
    }
  }
  await Promise.all(promises);

  console.log(
    chalk.green.bold(
      `\n\u203A Your Expo + Next.js project now has all of the required customizations\n`
    )
  );
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

  let values = [];

  for (const customization of manifest) {
    const enabled = await customization.onEnabledAsync({ projectRoot, force });
    values.push({
      name: customization.name,
      disabled: !force && enabled ? '✔︎' : false,
      message: force && enabled ? chalk.red(customization.name) : customization.name,
    });
  }

  if (!values.filter(({ disabled }) => !disabled).length) {
    console.log(
      chalk.yellow('\nAll of the custom web files already exist.') +
        '\nTo regenerate the files run:' +
        chalk.bold(' expo customize:web --force\n')
    );
    return;
  }

  //   await maybeWarnToCommitAsync(projectDir);

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
