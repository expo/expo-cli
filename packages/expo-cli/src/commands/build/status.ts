import { UrlUtils } from '@expo/xdl';
import BaseBuilder from './BaseBuilder';
import CommandError from '../../CommandError';

export default async function buildStatus(projectDir: string, options: { publicUrl?: string }) {
  if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  }
  const builder = new BaseBuilder(projectDir, options);
  return await builder.commandCheckStatus();
}
