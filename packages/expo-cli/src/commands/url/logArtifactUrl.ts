import { UrlUtils } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import { BuildJobFields, getBuildStatusAsync } from '../build/getBuildStatusAsync';

type ArtifactUrlOptions = {
  publicUrl?: string;
};

function assertHTTPS(url?: string) {
  if (url && !UrlUtils.isHttps(url)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  }
}

export const logArtifactUrl = (platform: 'ios' | 'android') => async (
  projectRoot: string,
  options: ArtifactUrlOptions
) => {
  assertHTTPS(options.publicUrl);

  const result = await getBuildStatusAsync(projectRoot, {
    current: false,
    ...(options.publicUrl ? { publicUrl: options.publicUrl } : {}),
  });

  const url = result.jobs?.filter((job: BuildJobFields) => job.platform === platform)[0]?.artifacts
    ?.url;

  if (!url) {
    throw new CommandError(
      `No ${platform} binary file found. Use "expo build:${platform}" to create one.`
    );
  }

  Log.nested(url);
};
