import fs from 'fs';
import { Readable } from 'stream';

import { ApiV2, FormData, UserManager } from '@expo/xdl';
import axios from 'axios';
import concat from 'concat-stream';
import md5File from 'md5-file/promise';

enum UploadType {
  TURTLE_PROJECT_SOURCES = 'turtle-project-sources',
  SUBMISSION_APP_ARCHIVE = 'submission-app-archive',
}

interface S3PresignedPost {
  url: string;
  fields: Record<string, string>;
}

async function uploadAsync(uploadType: UploadType, filePath: string): Promise<string> {
  const presignedPost = await obtainS3PresignedPostAsync(uploadType, filePath);
  return await uploadWithPresignedPostAsync(fs.createReadStream(filePath), presignedPost);
}

async function obtainS3PresignedPostAsync(
  uploadType: UploadType,
  filePath: string
): Promise<S3PresignedPost> {
  const fileHash = await md5File(filePath);
  const api = await getApiClientForUser();
  const { presignedUrl } = await api.postAsync('upload-sessions', {
    type: uploadType,
    checksum: fileHash,
  });
  return presignedUrl;
}

async function uploadWithPresignedPostAsync(src: Readable, presignedPost: S3PresignedPost) {
  const form = new FormData();
  for (const [fieldKey, fieldValue] of Object.entries(presignedPost.fields)) {
    form.append(fieldKey, fieldValue);
  }
  form.append('file', src);
  const formBuffer = await convertFormDataToBuffer(form);
  const result = await axios.post(presignedPost.url, formBuffer, {
    headers: form.getHeaders(),
    maxContentLength: formBuffer.byteLength,
  });
  return String(result.headers.location);
}

async function convertFormDataToBuffer(formData: FormData): Promise<Buffer> {
  return new Promise(resolve => {
    formData.pipe(concat({ encoding: 'buffer' }, data => resolve(data)));
  });
}

async function getApiClientForUser(): Promise<ApiV2> {
  const user = await UserManager.ensureLoggedInAsync();
  return ApiV2.clientForUser(user);
}

export { uploadAsync, UploadType };
