import { getPackageJson } from '@expo/config';
import { createForProject } from '@expo/package-manager';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import resolveFrom from 'resolve-from';

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

const generatedTag = `@generated: @expo/next-adapter@${
  require('@expo/next-adapter/package.json').version
}`;

function createJSTag(): string {
  return `// ${generatedTag}`;
}

function createBashTag(): string {
  return `# ${generatedTag}`;
}

async function copyFileAsync(
  from: string,
  to: string,
  force: boolean,
  tag?: string
): Promise<void> {
  if (!force && (await fs.pathExists(to))) {
    throw new Error(`Cannot overwrite file at "${to}" without the \`force\` option`);
  }
  if (await fs.pathExists(from)) {
    if (tag) {
      const contents = await fs.readFile(from, 'utf8');

      await fs.ensureDir(path.dirname(to));
      await fs.writeFile(to, `${tag}\n${contents}`);
    } else {
      await fs.copy(from, to, { overwrite: true, recursive: true });
    }
  } else {
    throw new Error(`Expected template file for ${from} doesn't exist at path: ${to}`);
  }
}

async function projectHasLatestFileAsync(destinationPath: string, tag: string): Promise<boolean> {
  if (await fs.pathExists(destinationPath)) {
    const contents = await fs.readFile(destinationPath, 'utf8');
    return contents.includes(tag);
  }
  return false;
}

const packageRoot = path.join(__dirname, '../../');

function getDependencies(
  projectRoot: string
): { dependencies: string[]; devDependencies: string[] } {
  const dependencies = ['react-native-web', 'next'].filter(
    dependency => !resolveFrom.silent(projectRoot, dependency)
  );
  const devDependencies = ['@expo/next-adapter', 'babel-preset-expo'].filter(
    dependency => !resolveFrom.silent(projectRoot, dependency)
  );

  return { dependencies, devDependencies };
}

export const manifest: CustomizeOption[] = [
  {
    name: 'Install Next.js dependencies',
    type: 'required',
    destinationPath: (projectRoot: string) => '',
    description: 'Ensure your project has all of the required dependencies',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const { dependencies, devDependencies } = getDependencies(projectRoot);
      const all = [...dependencies, ...devDependencies];
      return !!all.length;
    },
    async onSelectAsync({ projectRoot }): Promise<void> {
      const { dependencies, devDependencies } = getDependencies(projectRoot);
      const all = [...dependencies, ...devDependencies];
      if (!all.length) {
        console.log(
          chalk.magenta.dim(`\u203A All of the required dependencies are installed already`)
        );
        return;
      } else {
        console.log(chalk.magenta(`\u203A Installing the missing dependencies: ${all.join(', ')}`));
      }

      const packageManager = createForProject(projectRoot);

      if (dependencies.length) await packageManager.addAsync(...dependencies);
      if (devDependencies.length) await packageManager.addDevAsync(...devDependencies);
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
      return !(await projectHasLatestFileAsync(destinationPath, createJSTag()));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));

      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force, createJSTag());
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
      return !(await projectHasLatestFileAsync(destinationPath, createJSTag()));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force, createJSTag());
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
      return !(await projectHasLatestFileAsync(destinationPath, createJSTag()));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      // TODO: Bacon: Handle the fact that this file will probably exist
      await copyFileAsync(this.templatePath!, destinationPath, force, createJSTag());
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
      return !(await projectHasLatestFileAsync(destinationPath, createJSTag()));
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      console.log(chalk.magenta(`\u203A Creating ${this.description}`));
      const destinationPath = this.destinationPath(projectRoot);
      await copyFileAsync(this.templatePath!, destinationPath, force, createJSTag());
    },
  },
  {
    name: 'Add build script',
    type: 'required',
    destinationPath: projectRoot => '',
    description: 'the build script required for deploying to now.',
    async onEnabledAsync({ projectRoot, force }): Promise<boolean> {
      if (force) return true;

      const pkg = await readPackageJsonAsync(projectRoot);

      const hasNowBuildScript = pkg.scripts.build && pkg.scripts.build.trim() === 'next build';

      return !hasNowBuildScript;
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      const pkg = await readPackageJsonAsync(projectRoot);

      if (!force && pkg.scripts.build) {
        console.warn(chalk.yellow(`\u203A A build script already exists.`));
        return;
      }

      pkg.scripts.build = 'next build';

      console.log(
        chalk.magenta(
          `\u203A Adding a build script to your \`${chalk.bold(
            `package.json`
          )}\` for deployment to now.`
        )
      );

      await fs.writeFile(path.resolve(projectRoot, 'package.json'), JSON.stringify(pkg, null, 2));
    },
  },
  {
    name: 'Update git ignore',
    type: 'required',
    destinationPath: projectRoot => path.resolve(projectRoot, '.gitignore'),
    templatePath: path.resolve(packageRoot, 'template/default-gitignore'),
    description: 'Ensure Next.js and Expo generated folders are ignored in .gitignore',
    async onEnabledAsync({ projectRoot }): Promise<boolean> {
      const destinationPath = this.destinationPath(projectRoot);
      if (!(await fs.pathExists(destinationPath))) {
        return true;
      }
      const contents = await fs.readFile(destinationPath, 'utf8');
      return !contents.includes(createBashTag());
    },
    async onSelectAsync({ projectRoot, force }): Promise<void> {
      const destinationPath = this.destinationPath(projectRoot);

      // Ensure a default expo .gitignore exists
      if (!(await fs.pathExists(destinationPath))) {
        console.log(
          chalk.magenta(
            `\u203A Creating a default .gitignore for a universal Expo project with Next.js support`
          )
        );
        await copyFileAsync(this.templatePath!, destinationPath, true, createBashTag());
      }

      // Ensure the .gitignore has the required fields
      let contents = await fs.readFile(destinationPath, 'utf8');

      if (contents.includes(createBashTag())) {
        console.warn(
          chalk.yellow('The .gitignore already appears to contain expo generated files')
        );
        return;
      }

      console.log(chalk.magenta(`\u203A Adding the generated folders to your .gitignore`));

      const ignore = [
        '',
        createBashTag(),
        '/.expo/*',
        '# Expo Web',
        '/web-build/*',
        '# Expo Native',
        '*.jks',
        '*.p8',
        '*.p12',
        '*.key',
        '*.mobileprovision',
        '*.orig.*',
        '# Next.js',
        '/.next/*',
        '/out/',
        '# Next.js production',
        '/build/',
        '# Next.js dependencies',
        '/.pnp',
        '.pnp.js',
        '# @end @expo/next-adapter',
        '',
      ];

      contents += ignore.join('\n');
      await fs.writeFile(destinationPath, contents);
    },
  },
];

async function readPackageJsonAsync(
  projectRoot: string
): Promise<{ scripts: { build?: string }; [key: string]: any }> {
  const pkg = getPackageJson(projectRoot) as any;

  if (!pkg.scripts) pkg.scripts = {};

  return pkg;
}
