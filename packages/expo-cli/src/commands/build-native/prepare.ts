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

  const { value, error } = JobSchema.validate(userData);
  if (error) {
    throw error;
  } else {
    return value as Job;
  }
}

async function getPlatformCredentials(platform: Platform, projectDir: string)
  : Promise<Android.Credentials | iOS.Credentials> {
  const jsonCredentials = await BuildConfig.read(projectDir);
  if (platform === Platform.Android) {
    return await BuildConfig.prepareAndroidJobCredentials(jsonCredentials);
  } else if (platform === Platform.iOS) {
    return await BuildConfig.prepareiOSJobCredentials(jsonCredentials);
  } else {
    throw Error('Unsupported platform');
  }
}

export { getUserData };
