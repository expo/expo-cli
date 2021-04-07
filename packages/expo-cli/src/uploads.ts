import { ApiV2, UserManager } from '@expo/api';
import FormData from 'form-data';
import fs from 'fs';
import got, { Progress } from 'got';
import md5File from 'md5-file';
import { Readable } from 'stream';

enum UploadType {
  TURTLE_PROJECT_SOURCES = 'turtle-project-sources',
  SUBMISSION_APP_ARCHIVE = 'submission-app-archive',
}

type ProgressHandler = (progress: Progress) => void;

async function uploadAsync(
  uploadType: UploadType,
  path: string,
  handleProgressEvent?: ProgressHandler
): Promise<string> {
  const presignedPost = await obtainS3PresignedPostAsync(uploadType, path);
  return await uploadWithPresignedPostAsync(
    fs.createReadStream(path),
    presignedPost,
    handleProgressEvent
  );
}

interface S3PresignedPost {
  url: string;
  fields: Record<string, string>;
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

async function uploadWithPresignedPostAsync(
  stream: Readable,
  presignedPost: S3PresignedPost,
  handleProgressEvent?: ProgressHandler
) {
  const form = new FormData();
  for (const [fieldKey, fieldValue] of Object.entries(presignedPost.fields)) {
    form.append(fieldKey, fieldValue);
  }
  form.append('file', stream);
  const formHeaders = form.getHeaders();
  let uploadPromise = got.post(presignedPost.url, { body: form, headers: { ...formHeaders } });
  if (handleProgressEvent) {
    uploadPromise = uploadPromise.on('uploadProgress', handleProgressEvent);
  }
  const response = await uploadPromise;
  return String(response.headers.location);
}

async function getApiClientForUser(): Promise<ApiV2> {
  const user = await UserManager.ensureLoggedInAsync();
  return ApiV2.clientForUser(user);
}

export { uploadAsync, UploadType };
