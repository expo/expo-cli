// Inspired by create-next-app & create-react-native-app
import JsonFile, { JSONObject } from '@expo/json-file';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import terminalLink from 'terminal-link';
import { URL } from 'url';

import { createFetch } from './fetch';
import { applyKnownNpmPackageNameRules, createUrlStreamAsync, extractNpmTarballAsync } from './npm';
import { isUrlOk } from './url';

type RepoInfo = {
  username: string;
  name: string;
  branch: string;
  filePath: string;
};

export async function promptAsync(): Promise<string | null> {
  const { value } = await prompts({
    type: 'select',
    name: 'value',
    limit: 11,
    message: 'How would you like to start',
    choices: [
      { title: 'Default new app', value: 'default' },
      {
        title: `Template from ${terminalLink('expo/examples', 'https://github.com/expo/examples', {
          fallback: (text, url) => `${text}: ${url}`,
        })}`,
        value: 'example',
      },
    ],
  });

  if (!value) {
    console.log();
    console.log('Please specify the template');
    process.exit(1);
  }

  if (value === 'example') {
    let examplesJSON: any;

    try {
      examplesJSON = await listAsync();
    } catch (error) {
      console.log();
      console.log('Failed to fetch the list of examples with the following error:');
      console.error(error);
      console.log();
      console.log('Switching to the default starter app');
      console.log();
    }

    if (examplesJSON) {
      const choices = examplesJSON.map(({ name }: any) => ({
        title: name,
        value: name,
      }));
      // The search function built into `prompts` isn’t very helpful:
      // someone searching for `styled-components` would get no results since
      // the example is called `with-styled-components`, and `prompts` searches
      // the beginnings of titles.
      const nameRes = await prompts({
        type: 'autocomplete',
        name: 'exampleName',
        message: 'Pick an example',
        choices,
        suggest: createSelectionFilter(),
      });

      if (!nameRes.exampleName) {
        console.log();
        console.log('Please specify an example or use the default starter app.');
        process.exit(1);
      }

      return nameRes.exampleName.trim();
    }
  }

  return null;
}

function createSelectionFilter(): (input: any, choices: prompts.Choice[]) => Promise<any> {
  function escapeRegex(string: string) {
    return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  return async (input: any, choices: prompts.Choice[]) => {
    try {
      const regex = new RegExp(escapeRegex(input), 'i');
      return choices.filter((choice: any) => regex.test(choice.title));
    } catch (error: any) {
      // console.debug('Error filtering choices', error);
      return [];
    }
  };
}

async function getRepoInfo(url: any, examplePath?: string): Promise<RepoInfo | undefined> {
  const [, username, name, t, _branch, ...file] = url.pathname.split('/');
  const filePath = examplePath ? examplePath.replace(/^\//, '') : file.join('/');

  // Support repos whose entire purpose is to be an example, e.g.
  // https://github.com/:username/:my-cool-example-repo-name.
  if (t === undefined) {
    const infoResponse = await cachedFetch(
      `https://api.github.com/repos/${username}/${name}`
    ).catch((e: any) => e);
    if (infoResponse.status !== 200) {
      return;
    }
    const info = await infoResponse.json();
    return { username, name, branch: info['default_branch'], filePath };
  }

  // If examplePath is available, the branch name takes the entire path
  const branch = examplePath
    ? `${_branch}/${file.join('/')}`.replace(new RegExp(`/${filePath}|/$`), '')
    : _branch;

  if (username && name && branch && t === 'tree') {
    return { username, name, branch, filePath };
  }
  return undefined;
}

function hasRepo({ username, name, branch, filePath }: RepoInfo) {
  const contentsUrl = `https://api.github.com/repos/${username}/${name}/contents`;
  const packagePath = `${filePath ? `/${filePath}` : ''}/package.json`;

  return isUrlOk(contentsUrl + packagePath + `?ref=${branch}`);
}

export async function resolveTemplateArgAsync(
  projectRoot: string,
  oraInstance: any,
  template: string,
  templatePath?: string
) {
  let repoInfo: RepoInfo | undefined;

  if (template) {
    // @ts-ignore
    let repoUrl: URL | undefined;

    try {
      repoUrl = new URL(template);
    } catch (error: any) {
      if (error.code !== 'ERR_INVALID_URL') {
        oraInstance.fail(error);
        process.exit(1);
      }
    }

    if (repoUrl) {
      if (repoUrl.origin !== 'https://github.com') {
        oraInstance.fail(
          `Invalid URL: ${chalk.red(
            `"${template}"`
          )}. Only GitHub repositories are supported. Please use a GitHub URL and try again.`
        );
        process.exit(1);
      }

      repoInfo = await getRepoInfo(repoUrl, templatePath);

      if (!repoInfo) {
        oraInstance.fail(
          `Found invalid GitHub URL: ${chalk.red(
            `"${template}"`
          )}. Please fix the URL and try again.`
        );
        process.exit(1);
      }

      const found = await hasRepo(repoInfo);

      if (!found) {
        oraInstance.fail(
          `Could not locate the repository for ${chalk.red(
            `"${template}"`
          )}. Please check that the repository exists and try again.`
        );
        process.exit(1);
      }
    } else {
      const found = await hasExample(template);

      if (!found) {
        oraInstance.fail(`Could not locate the template named ${chalk.red(`"${template}"`)}.`);
        process.exit(1);
      }
    }
  }

  if (repoInfo) {
    oraInstance.text = chalk.bold(
      `Downloading files from repo ${chalk.cyan(template)}. This might take a moment.`
    );

    await downloadAndExtractRepoAsync(projectRoot, repoInfo);
  } else {
    oraInstance.text = chalk.bold(
      `Downloading files for example ${chalk.cyan(template)}. This might take a moment.`
    );

    await downloadAndExtractExampleAsync(projectRoot, template);
  }

  await ensureProjectHasGitIgnore(projectRoot);

  return true;
}

function projectHasNativeCode(projectRoot: string): boolean {
  const iosPath = path.join(projectRoot, 'ios');
  const androidPath = path.join(projectRoot, 'android');
  return fs.existsSync(iosPath) || fs.existsSync(androidPath);
}

function getScriptsForProject(projectRoot: string): Record<string, string> {
  if (projectHasNativeCode(projectRoot)) {
    return {
      android: 'expo run:android',
      ios: 'expo run:ios',
      web: 'expo start --web',
      start: 'expo start --dev-client',
    };
  }
  return {
    start: 'expo start',
    android: 'expo start --android',
    ios: 'expo start --ios',
    web: 'expo start --web',
  };
}

export async function appendScriptsAsync(projectRoot: string): Promise<void> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageFile = new JsonFile(packageJsonPath);
    let packageJson = await packageFile.readAsync();
    packageJson = {
      ...packageJson,
      // Assign scripts for the workflow
      scripts: {
        ...getScriptsForProject(projectRoot),
        // Existing scripts have higher priority
        ...((packageJson.scripts || {}) as JSONObject),
      },
      // These are metadata fields related to the template package, let's remove them from the package.json.
      // A good place to start
      version: '1.0.0',
      // Adding `private` stops npm from complaining about missing `name` and `version` fields.
      // We don't add a `name` field because it also exists in `app.json`.
      private: true,
    };
    // name and version are required for yarn workspaces (monorepos)
    packageJson.name = applyKnownNpmPackageNameRules(path.basename(projectRoot)) || 'app';
    await packageFile.writeAsync(packageJson);
  }
}

function ensureProjectHasGitIgnore(projectRoot: string): void {
  // Copy our default `.gitignore` if the application did not provide one
  const ignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(ignorePath)) {
    fs.copyFileSync(require.resolve('../template/gitignore'), ignorePath);
  }
}

function hasExample(name: string): Promise<boolean> {
  return isUrlOk(
    `https://api.github.com/repos/expo/examples/contents/${encodeURIComponent(name)}/package.json`
  );
}

async function downloadAndExtractRepoAsync(
  root: string,
  { username, name, branch, filePath }: RepoInfo
): Promise<void> {
  const projectName = path.basename(root);

  const strip = filePath ? filePath.split('/').length + 1 : 1;

  await extractNpmTarballAsync(
    await createUrlStreamAsync(`https://codeload.github.com/${username}/${name}/tar.gz/${branch}`),
    {
      strip,
      cwd: root,
      name: projectName,
      fileList: [`${name}-${branch}${filePath ? `/${filePath}` : ''}`],
    }
  );
}

async function downloadAndExtractExampleAsync(root: string, name: string): Promise<void> {
  const projectName = path.basename(root);

  await extractNpmTarballAsync(
    await createUrlStreamAsync('https://codeload.github.com/expo/examples/tar.gz/master'),
    {
      strip: 2,
      cwd: root,
      name: projectName,
      fileList: [`examples-master/${name}`],
    }
  );
}

const cachedFetch = createFetch({
  cacheDirectory: 'github-api',
  ttl: 1000 * 60 * 60, // 1 hour
});

async function listAsync(): Promise<any> {
  const res = await cachedFetch('https://api.github.com/repos/expo/examples/contents');
  const results = await res.json();
  return results.filter(({ name, type }: any) => type === 'dir' && !name?.startsWith('.'));
}
