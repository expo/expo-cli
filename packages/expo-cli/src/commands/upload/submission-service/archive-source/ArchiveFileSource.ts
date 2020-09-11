import { Platform } from '@expo/config';
import { StandaloneBuild } from '@expo/xdl';
import validator from 'validator';

import log from '../../../../log';
import prompt from '../../../../prompt';
import { existingFile } from '../../../../validators';
import { SubmissionMode } from '../types';
import { getAppConfig } from '../utils/config';
import {
  downloadAppArchiveAsync,
  extractLocalArchiveAsync,
  pathIsTar,
  uploadAppArchiveAsync,
} from '../utils/files';

enum ArchiveFileSourceType {
  url,
  latest,
  path,
  buildId,
  prompt,
}

interface ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType;
  projectDir: string;
  platform: Platform;
}

interface ArchiveFileUrlSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.url;
  url: string;
}

interface ArchiveFileLatestSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.latest;
}

interface ArchiveFilePathSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.path;
  path: string;
}

interface ArchiveFileBuildIdSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.buildId;
  id: string;
}

interface ArchiveFilePromptSource extends ArchiveFileSourceBase {
  sourceType: ArchiveFileSourceType.prompt;
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
      const url = await handleUrlSourceAsync(mode, source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
    case ArchiveFileSourceType.latest: {
      const url = await handleLatestSourceAsync(mode, source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
    case ArchiveFileSourceType.path: {
      const path = await handlePathSourceAsync(mode, source);
      return getArchiveLocationForPathAsync(mode, path);
    }
    case ArchiveFileSourceType.buildId: {
      const url = await handleBuildIdSourceAsync(mode, source);
      return await getArchiveLocationForUrlAsync(mode, url);
    }
  }
}

async function getArchiveLocationForUrlAsync(mode: SubmissionMode, url: string): Promise<string> {
  // When a URL points to a tar file, download it and extract using unified logic.
  // Otherwise send it directly to the server in online mode.
  if (mode === SubmissionMode.online && !pathIsTar(url)) {
    return url;
  } else {
    log('Downloading your app archive');
    return downloadAppArchiveAsync(url);
  }
}

async function getArchiveLocationForPathAsync(mode: SubmissionMode, path: string): Promise<string> {
  const resolvedPath = await extractLocalArchiveAsync(path);

  if (mode === SubmissionMode.online) {
    log('Uploading your app archive to the Expo Submission Service');
    return await uploadAppArchiveAsync(resolvedPath);
  } else {
    return resolvedPath;
  }
}

async function handleUrlSourceAsync(
  mode: SubmissionMode,
  source: ArchiveFileUrlSource
): Promise<string> {
  return source.url;
}

async function handleLatestSourceAsync(
  mode: SubmissionMode,
  source: ArchiveFileLatestSource
): Promise<string> {
  const { owner, slug } = getAppConfig(source.projectDir);
  const builds = await StandaloneBuild.getStandaloneBuilds(
    {
      platform: source.platform,
      owner,
      slug,
    },
    1
  );
  if (builds.length === 0) {
    log.error(
      log.chalk.bold(
        "Couldn't find any builds for this project on Expo servers. It looks like you haven't run expo build:android yet."
      )
    );
    return getArchiveFileLocationAsync(mode, {
      sourceType: ArchiveFileSourceType.prompt,
      platform: source.platform,
      projectDir: source.projectDir,
    });
  }
  return builds[0].artifacts.url;
}

async function handlePathSourceAsync(
  mode: SubmissionMode,
  source: ArchiveFilePathSource
): Promise<string> {
  if (!(await existingFile(source.path))) {
    log.error(log.chalk.bold(`${source.path} doesn't exist`));
    return getArchiveFileLocationAsync(mode, {
      sourceType: ArchiveFileSourceType.prompt,
      platform: source.platform,
      projectDir: source.projectDir,
    });
  }
  return source.path;
}

async function handleBuildIdSourceAsync(
  mode: SubmissionMode,
  source: ArchiveFileBuildIdSource
): Promise<string> {
  const { owner, slug } = getAppConfig(source.projectDir);
  let build: any;
  try {
    build = await StandaloneBuild.getStandaloneBuildById({
      platform: source.platform,
      id: source.id,
      owner,
      slug,
    });
  } catch (err) {
    log.error(err);
    throw err;
  }

  if (!build) {
    log.error(log.chalk.bold(`Couldn't find build for id ${source.id}`));
    return getArchiveFileLocationAsync(mode, {
      sourceType: ArchiveFileSourceType.prompt,
      platform: source.platform,
      projectDir: source.projectDir,
    });
  } else {
    return build.artifacts.url;
  }
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
        name: 'The latest build from Expo servers',
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
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.path: {
      const path = await askForArchivePathAsync();
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.path,
        path,
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.latest: {
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.latest,
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.buildId: {
      const id = await askForBuildIdAsync();
      return getArchiveFileLocationAsync(mode, {
        sourceType: ArchiveFileSourceType.buildId,
        id,
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.prompt:
      throw new Error('This should never happen');
  }
}

async function askForArchiveUrlAsync(): Promise<string> {
  const defaultArchiveUrl = 'https://url.to/your/archive.aab';
  const { url } = await prompt({
    name: 'url',
    message: 'URL:',
    default: defaultArchiveUrl,
    type: 'input',
    validate: (url: string): string | boolean => {
      if (url === defaultArchiveUrl) {
        return 'That was just an example URL, meant to show you the format that we expect for the response.';
      } else if (!validateUrl(url)) {
        return `${url} does not conform to HTTP format`;
      } else {
        return true;
      }
    },
  });
  return url;
}

async function askForArchivePathAsync(): Promise<string> {
  const defaultArchivePath = '/path/to/your/archive.aab';
  const { path } = await prompt({
    name: 'path',
    message: 'Path to the app archive file (aab or apk):',
    default: defaultArchivePath,
    type: 'input',
    validate: async (path: string): Promise<boolean | string> => {
      if (path === defaultArchivePath) {
        return 'That was just an example path, meant to show you the format that we expect for the response.';
      } else if (!(await existingFile(path, false))) {
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
    validate: (val: string): string | boolean => {
      if (!validator.isUUID(val)) {
        return `${val} is not a valid id`;
      } else {
        return true;
      }
    },
  });
  return id;
}

function validateUrl(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
  });
}

export { ArchiveFileSourceType, getArchiveFileLocationAsync };
