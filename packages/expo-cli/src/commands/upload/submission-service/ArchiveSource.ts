import { StandaloneBuild } from '@expo/xdl';
import { Platform } from '@expo/config';
import ora from 'ora';
import validator from 'validator';

import { getAppConfig } from './utils/config';
import prompt from '../../../prompt';
import { UploadType, uploadAsync } from '../../../uploads';
import { existingFile } from '../../../validators';

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

async function getArchiveUrlAsync(source: ArchiveSource): Promise<string> {
  switch (source.sourceType) {
    case ArchiveSourceType.url:
      return await handleUrlSourceAsync(source);
    case ArchiveSourceType.latest:
      return await handleLatestsSourceAsync(source);
    case ArchiveSourceType.path:
      return await handlePathSourceAsync(source);
    case ArchiveSourceType.buildId:
      return await handleBuildIdSourceAsync(source);
    case ArchiveSourceType.prompt:
      return await handlePromptSourceAsync(source);
  }
}

async function handleUrlSourceAsync(source: ArchiveUrlSource): Promise<string> {
  return source.url;
}

async function handleLatestsSourceAsync(source: ArchiveLatestSource): Promise<string> {
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
  const spinner = ora(`Uploading ${source.path}`).start();
  try {
    const archiveUrl = await uploadAsync(UploadType.SUBMISSION_APP_ARCHIVE, source.path);
    spinner.succeed();
    return archiveUrl;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

async function handleBuildIdSourceAsync(source: ArchiveBuildIdSource): Promise<string> {
  const build = await StandaloneBuild.getStandaloneBuildById({
    platform: source.platform,
    id: source.id,
    owner: source.owner,
    slug: source.slug,
  });
  if (!build) {
    throw new Error(`Couldn't find build with id: ${source.id}`);
  }
  return build.artifacts.url;
}

async function handlePromptSourceAsync(source: ArchivePromptSource): Promise<string> {
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
      return getArchiveUrlAsync({
        sourceType: ArchiveSourceType.url,
        url,
      });
    }
    case ArchiveSourceType.path: {
      const path = await askForArchivePathAsync();
      return getArchiveUrlAsync({
        sourceType: ArchiveSourceType.path,
        path,
      });
    }
    case ArchiveSourceType.latest: {
      const { owner, slug } = getAppConfig(source.projectDir);
      return getArchiveUrlAsync({
        sourceType: ArchiveSourceType.latest,
        platform: source.platform,
        owner,
        slug,
      });
    }
    case ArchiveSourceType.buildId: {
      const id = await askForBuildIdAsync();
      const { owner, slug } = getAppConfig(source.projectDir);
      return getArchiveUrlAsync({
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

export { ArchiveSourceType, getArchiveUrlAsync };
