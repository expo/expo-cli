import { BuildConfig, BuildType, Platform, Android, iOS, JobSchema, Job } from '@expo/build-tools';

export type Options = {
  platform: Platform;
  type: BuildType;
}

async function getUserData(options: Options, projectUrl: string, projectDir: string)
  : Promise<Job> {
  const credentials = await getPlatformCredentials(options.platform, projectDir);
  const userData = {
    credentials,
    platform: options.platform,
    projectUrl,
    type: options.type,
  }

  const validatedData = JobSchema.validate(userData).value as Job;
  return validatedData;
}

async function getPlatformCredentials(platform: Platform, projectDir: string)
  : Promise<Android.Credentials | iOS.Credentials> {
  const jsonCredentials = await BuildConfig.read(projectDir);
  const prepareCredentials = {
    android: BuildConfig.prepareAndroidJobCredentials,
    ios: BuildConfig.prepareiOSJobCredentials,
  }
  return await prepareCredentials[platform](jsonCredentials);
}

export { getUserData };
