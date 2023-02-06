import { getVersionsAsync } from '../api/getVersionsAsync';

export type DependencyList = Record<string, string>;

export const getRemoteVersionsForSdkAsync = async (
  sdkVersion?: string
): Promise<DependencyList> => {
  const { sdkVersions } = await getVersionsAsync();
  if (sdkVersion && sdkVersion in sdkVersions) {
    const { relatedPackages, facebookReactVersion, facebookReactNativeVersion } = sdkVersions[
      sdkVersion
    ];
    const reactVersion = facebookReactVersion
      ? {
          react: facebookReactVersion,
          'react-dom': facebookReactVersion,
        }
      : undefined;
    return {
      ...relatedPackages,
      ...reactVersion,
      'react-native': facebookReactNativeVersion,
    };
  }
  return {};
};
