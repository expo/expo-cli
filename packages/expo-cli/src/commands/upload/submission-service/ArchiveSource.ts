import os from 'os';
import { basename as pathBasename, join as pathJoin } from 'path';

import { StandaloneBuild } from '@expo/xdl';
import { Platform } from '@expo/config';

import validator from 'validator';

import { getAppConfig } from './utils/config';
import prompt from '../../../prompt';
import { existingFile } from '../../../validators';
import { SubmissionMode } from './types';
import { downloadAppArchiveAsync, uploadAppArchiveAsync } from './utils/files';

enum ArchiveSourceType {
  url,
  latest,
  path,
  buildId,
  prompt,
}

interface ArchiveSourceBase {
  sourceType: ArchiveSourceType;
}

interface ArchiveUrlSource extends ArchiveSourceBase {
  sourceType: ArchiveSourceType.url;
  url: string;
}

interface ArchiveLatestSource extends ArchiveSourceBase {
  sourceType: ArchiveSourceType.latest;
  platform: Platform;
  owner?: string;
  slug: string;
}

interface ArchivePathSource extends ArchiveSourceBase {
  sourceType: ArchiveSourceType.path;
  path: string;
}

interface ArchiveBuildIdSource extends ArchiveSourceBase {
  sourceType: ArchiveSourceType.buildId;
  platform: Platform;
  id: string;
  owner?: string;
  slug: string;
}

interface ArchivePromptSource extends ArchiveSourceBase {
  sourceType: ArchiveSourceType.prompt;
  platform: Platform;
  projectDir: string;
}

export type ArchiveSource =
  | ArchiveUrlSource
  | ArchiveLatestSource
  | ArchivePathSource
  | ArchiveBuildIdSource
  | ArchivePromptSource;

async function getArchiveLocationAsync(
  mode: SubmissionMode,
  source: ArchiveSource
): Promise<string> {
  switch (source.sourceType) {
    case ArchiveSourceType.prompt:
      return await handlePromptSourceAsync(mode, source);
    case ArchiveSourceType.url: {
      const url = await handleUrlSourceAsync(source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
    case ArchiveSourceType.latest: {
      const url = await handleLatestSourceAsync(source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
    case ArchiveSourceType.path: {
      const path = await handlePathSourceAsync(source);
      return getArchiveLocationForPathAsync(mode, path);
    }
    case ArchiveSourceType.buildId: {
      const url = await handleBuildIdSourceAsync(source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
  }
}

async function getArchiveLocationForUrlAsync(mode: SubmissionMode, url: string): Promise<string> {
  if (mode === SubmissionMode.online) {
    return url;
  } else {
    const tmpPath = pathJoin(os.tmpdir(), pathBasename(url));
    return downloadAppArchiveAsync(url, tmpPath);
  }
}

async function getArchiveLocationForPathAsync(mode: SubmissionMode, path: string): Promise<string> {
  if (mode === SubmissionMode.online) {
    return await uploadAppArchiveAsync(path);
  } else {
    return path;
  }
}

async function handleUrlSourceAsync(source: ArchiveUrlSource): Promise<string> {
  return source.url;
}

async function handleLatestSourceAsync(source: ArchiveLatestSource): Promise<string> {
  const builds = await StandaloneBuild.getStandaloneBuilds(
    {
      platform: source.platform,
      owner: source.owner,
      slug: source.slug,
    },
    1
  );
  if (builds.length === 0) {
    throw new Error("Couldn't find any builds for this project.");
  }
  return builds[0].artifacts.url;
}

async function handlePathSourceAsync(source: ArchivePathSource): Promise<string> {
  if (!(await existingFile(source.path))) {
    throw new Error(`${source.path} doesn't exist`);
  }
  return source.path;
}

async function handleBuildIdSourceAsync(source: ArchiveBuildIdSource): Promise<string> {
  const build = await StandaloneBuild.getStandaloneBuildById({
    platform: source.platform,
    id: source.id,
    owner: source.owner,
    slug: source.slug,
  });
  if (!build) {
    throw new Error(`Couldn't find build for id ${source.id}`);
  }
  return build.artifacts.url;
}

async function handlePromptSourceAsync(
  mode: SubmissionMode,
  source: ArchivePromptSource
): Promise<string> {
  const { sourceType: sourceTypeRaw } = await prompt({
    name: 'sourceType',
    type: 'list',
    message: 'What would you like to submit?',
    choices: [
      { name: 'I have a url to the app archive', value: ArchiveSourceType.url },
      {
        name: "I'd like to upload the app archive from my computer",
        value: ArchiveSourceType.path,
      },
      {
        name: 'The lastest build from Expo Servers',
        value: ArchiveSourceType.latest,
      },
      {
        name: 'A build identified by a build id',
        value: ArchiveSourceType.buildId,
      },
    ],
  });
  const sourceType = sourceTypeRaw as ArchiveSourceType;
  switch (sourceType) {
    case ArchiveSourceType.url: {
      const url = await askForArchiveUrlAsync();
      return getArchiveLocationAsync(mode, {
        sourceType: ArchiveSourceType.url,
        url,
      });
    }
    case ArchiveSourceType.path: {
      const path = await askForArchivePathAsync();
      return getArchiveLocationAsync(mode, {
        sourceType: ArchiveSourceType.path,
        path,
      });
    }
    case ArchiveSourceType.latest: {
      const { owner, slug } = getAppConfig(source.projectDir);
      return getArchiveLocationAsync(mode, {
        sourceType: ArchiveSourceType.latest,
        platform: source.platform,
        owner,
        slug,
      });
    }
    case ArchiveSourceType.buildId: {
      const id = await askForBuildIdAsync();
      const { owner, slug } = getAppConfig(source.projectDir);
      return getArchiveLocationAsync(mode, {
        sourceType: ArchiveSourceType.buildId,
        platform: source.platform,
        owner,
        slug,
        id,
      });
    }
    case ArchiveSourceType.prompt:
      throw new Error('This should never happen');
  }
}

async function askForArchiveUrlAsync(): Promise<string> {
  const { url } = await prompt({
    name: 'url',
    message: 'URL:',
    type: 'input',
    validate: (url: string): string | boolean =>
      validateUrl(url) || `${url} does not conform to HTTP format`,
  });
  return url;
}

async function askForArchivePathAsync(): Promise<string> {
  const { path } = await prompt({
    name: 'path',
    message: 'Path to the app archive file:',
    type: 'input',
    validate: async (path: string): Promise<boolean | string> => {
      if (!(await existingFile(path, false))) {
        return `File ${path} doesn't exist.`;
      } else {
        return true;
      }
    },
  });
  return path;
}

async function askForBuildIdAsync(): Promise<string> {
  const { id } = await prompt({
    name: 'id',
    message: 'Build ID:',
    type: 'input',
    validate: (val: string): boolean => val !== '',
  });
  return id;
}

function validateUrl(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
  });
}

export { ArchiveSourceType, getArchiveLocationAsync };
