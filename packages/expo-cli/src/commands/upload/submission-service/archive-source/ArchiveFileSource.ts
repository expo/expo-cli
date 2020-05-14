import os from 'os';
import { basename as pathBasename, join as pathJoin } from 'path';

import { Platform } from '@expo/config';
import { StandaloneBuild } from '@expo/xdl';
import validator from 'validator';

import { downloadAppArchiveAsync, uploadAppArchiveAsync } from '../utils/files';
import { getAppConfig } from '../utils/config';
import { existingFile } from '../../../../validators';
import prompt from '../../../../prompt';
import { SubmissionMode } from '../types';

enum ArchiveFileSourceType {
  url,
  latest,
  path,
  buildId,
  prompt,
}

interface ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType;
}

interface ArchiveFileUrlSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.url;
  url: string;
}

interface ArchiveFileLatestSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.latest;
  platform: Platform;
  owner?: string;
  slug: string;
}

interface ArchiveFilePathSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.path;
  path: string;
}

interface ArchiveFileBuildIdSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.buildId;
  platform: Platform;
  id: string;
  owner?: string;
  slug: string;
}

interface ArchiveFilePromptSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.prompt;
  platform: Platform;
  projectDir: string;
}

export type ArchiveFileSource =
  | ArchiveFileUrlSource
  | ArchiveFileLatestSource
  | ArchiveFilePathSource
  | ArchiveFileBuildIdSource
  | ArchiveFilePromptSource;

async function getArchiveFileLocationAsync(
  mode: SubmissionMode,
  source: ArchiveFileSource
): Promise<string> {
  switch (source.sourceType) {
    case ArchiveFileSourceType.prompt:
      return await handlePromptSourceAsync(mode, source);
    case ArchiveFileSourceType.url: {
      const url = await handleUrlSourceAsync(source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
    case ArchiveFileSourceType.latest: {
      const url = await handleLatestSourceAsync(source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
    case ArchiveFileSourceType.path: {
      const path = await handlePathSourceAsync(source);
      return getArchiveLocationForPathAsync(mode, path);
    }
    case ArchiveFileSourceType.buildId: {
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

async function handleUrlSourceAsync(source: ArchiveFileUrlSource): Promise<string> {
  return source.url;
}

async function handleLatestSourceAsync(source: ArchiveFileLatestSource): Promise<string> {
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

async function handlePathSourceAsync(source: ArchiveFilePathSource): Promise<string> {
  if (!(await existingFile(source.path))) {
    throw new Error(`${source.path} doesn't exist`);
  }
  return source.path;
}

async function handleBuildIdSourceAsync(source: ArchiveFileBuildIdSource): Promise<string> {
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
  source: ArchiveFilePromptSource
): Promise<string> {
  const { sourceType: sourceTypeRaw } = await prompt({
    name: 'sourceType',
    type: 'list',
    message: 'What would you like to submit?',
    choices: [
      { name: 'I have a url to the app archive', value: ArchiveFileSourceType.url },
      {
        name: "I'd like to upload the app archive from my computer",
        value: ArchiveFileSourceType.path,
      },
      {
        name: 'The lastest build from Expo Servers',
        value: ArchiveFileSourceType.latest,
      },
      {
        name: 'A build identified by a build id',
        value: ArchiveFileSourceType.buildId,
      },
    ],
  });
  const sourceType = sourceTypeRaw as ArchiveFileSourceType;
  switch (sourceType) {
    case ArchiveFileSourceType.url: {
      const url = await askForArchiveUrlAsync();
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.url,
        url,
      });
    }
    case ArchiveFileSourceType.path: {
      const path = await askForArchivePathAsync();
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.path,
        path,
      });
    }
    case ArchiveFileSourceType.latest: {
      const { owner, slug } = getAppConfig(source.projectDir);
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.latest,
        platform: source.platform,
        owner,
        slug,
      });
    }
    case ArchiveFileSourceType.buildId: {
      const id = await askForBuildIdAsync();
      const { owner, slug } = getAppConfig(source.projectDir);
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.buildId,
        platform: source.platform,
        owner,
        slug,
        id,
      });
    }
    case ArchiveFileSourceType.prompt:
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

export { ArchiveFileSourceType, getArchiveFileLocationAsync };
