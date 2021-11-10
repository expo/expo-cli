import { Platform } from '@expo/config';
import { StandaloneBuild, UrlUtils } from 'xdl';

import Log from '../../../../log';
import prompt from '../../../../prompts';
import { existingFile } from '../../../../utils/validators';
import { isUUID } from '../../../utils/isUUID';
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

async function getArchiveFileLocationAsync(source: ArchiveFileSource): Promise<string> {
  switch (source.sourceType) {
    case ArchiveFileSourceType.prompt:
      return await handlePromptSourceAsync(source);
    case ArchiveFileSourceType.url: {
      const url = await handleUrlSourceAsync(source);
      return await getArchiveLocationForUrlAsync(url);
    }
    case ArchiveFileSourceType.latest: {
      const url = await handleLatestSourceAsync(source);
      return await getArchiveLocationForUrlAsync(url);
    }
    case ArchiveFileSourceType.path: {
      const path = await handlePathSourceAsync(source);
      return getArchiveLocationForPathAsync(path);
    }
    case ArchiveFileSourceType.buildId: {
      const url = await handleBuildIdSourceAsync(source);
      return await getArchiveLocationForUrlAsync(url);
    }
  }
}

async function getArchiveLocationForUrlAsync(url: string): Promise<string> {
  // When a URL points to a tar file, download it and extract using unified logic.
  // Otherwise send it directly to the server in online mode.
  if (!pathIsTar(url)) {
    return url;
  } else {
    Log.log('Downloading your app archive');
    return downloadAppArchiveAsync(url);
  }
}

async function getArchiveLocationForPathAsync(path: string): Promise<string> {
  const resolvedPath = await extractLocalArchiveAsync(path);

  Log.log('Uploading your app archive to the Expo Submission Service');
  return await uploadAppArchiveAsync(resolvedPath);
}

async function handleUrlSourceAsync(source: ArchiveFileUrlSource): Promise<string> {
  return source.url;
}

async function handleLatestSourceAsync(source: ArchiveFileLatestSource): Promise<string> {
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
    Log.error(
      Log.chalk.bold(
        "Couldn't find any builds for this project on Expo servers. It looks like you haven't run expo build:android yet."
      )
    );
    return getArchiveFileLocationAsync({
      sourceType: ArchiveFileSourceType.prompt,
      platform: source.platform,
      projectDir: source.projectDir,
    });
  }
  return builds[0].artifacts.url;
}

async function handlePathSourceAsync(source: ArchiveFilePathSource): Promise<string> {
  if (!(await existingFile(source.path))) {
    Log.error(Log.chalk.bold(`${source.path} doesn't exist`));
    return getArchiveFileLocationAsync({
      sourceType: ArchiveFileSourceType.prompt,
      platform: source.platform,
      projectDir: source.projectDir,
    });
  }
  return source.path;
}

async function handleBuildIdSourceAsync(source: ArchiveFileBuildIdSource): Promise<string> {
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
    Log.error(err);
    throw err;
  }

  if (!build) {
    Log.error(Log.chalk.bold(`Couldn't find build for id ${source.id}`));
    return getArchiveFileLocationAsync({
      sourceType: ArchiveFileSourceType.prompt,
      platform: source.platform,
      projectDir: source.projectDir,
    });
  } else {
    return build.artifacts.url;
  }
}

async function handlePromptSourceAsync(source: ArchiveFilePromptSource): Promise<string> {
  const { sourceType: sourceTypeRaw } = await prompt({
    name: 'sourceType',
    type: 'select',
    message: 'What would you like to submit?',
    choices: [
      { title: 'I have a url to the app archive', value: ArchiveFileSourceType.url },
      {
        title: "I'd like to upload the app archive from my computer",
        value: ArchiveFileSourceType.path,
      },
      {
        title: 'The latest build from Expo servers',
        value: ArchiveFileSourceType.latest,
      },
      {
        title: 'A build identified by a build id',
        value: ArchiveFileSourceType.buildId,
      },
    ],
  });
  const sourceType = sourceTypeRaw as ArchiveFileSourceType;
  switch (sourceType) {
    case ArchiveFileSourceType.url: {
      const url = await askForArchiveUrlAsync();
      return getArchiveFileLocationAsync({
        sourceType: ArchiveFileSourceType.url,
        url,
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.path: {
      const path = await askForArchivePathAsync();
      return getArchiveFileLocationAsync({
        sourceType: ArchiveFileSourceType.path,
        path,
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.latest: {
      return getArchiveFileLocationAsync({
        sourceType: ArchiveFileSourceType.latest,
        platform: source.platform,
        projectDir: source.projectDir,
      });
    }
    case ArchiveFileSourceType.buildId: {
      const id = await askForBuildIdAsync();
      return getArchiveFileLocationAsync({
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
    initial: defaultArchiveUrl,
    type: 'text',
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
    initial: defaultArchivePath,
    type: 'text',
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
    type: 'text',
    validate: (val: string): string | boolean => {
      if (!isUUID(val)) {
        return `${val} is not a valid id`;
      } else {
        return true;
      }
    },
  });
  return id;
}

function validateUrl(url: string): boolean {
  return UrlUtils.isURL(url, {
    protocols: ['http', 'https'],
  });
}

export { ArchiveFileSourceType, getArchiveFileLocationAsync };
