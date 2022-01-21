import { Versions } from '@expo/api';

export type DependencyList = Record<string, string>;

export const getRemoteVersionsForSdk = async (sdkVersion?: string): Promise<DependencyList> => {
  const { sdkVersions } = await Versions.getVersionsAsync({ skipCache: true });
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
