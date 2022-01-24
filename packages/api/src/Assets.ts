import FormData from 'form-data';

import ApiV2, { ApiV2ClientOptions } from './ApiV2';

export type S3AssetMetadata =
  | {
      exists: true;
      lastModified: Date;
      contentLength: number;
      contentType: string;
    }
  | {
      exists: false;
    };

export async function getMetadataAsync(
  user: ApiV2ClientOptions,
  { keys }: { keys: string[] }
): Promise<Record<string, S3AssetMetadata>> {
  const { metadata } = await ApiV2.clientForUser(user).postAsync('assets/metadata', {
    keys,
  });
  return metadata;
}

export async function uploadAsync(user: ApiV2ClientOptions, data: FormData): Promise<unknown> {
  return await ApiV2.clientForUser(user).uploadFormDataAsync('assets/upload', data);
}
