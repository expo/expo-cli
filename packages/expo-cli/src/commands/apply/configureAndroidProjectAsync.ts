import { IOSConfig, getConfig } from '@expo/config';
import path from 'path';

export default async function configureAndroidProjectAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  // TODO: implement this ;P
}
