import { Versions } from 'xdl';

export type DependencyList = Record<string, string>;

export const getRemoteVersionsForSdk = async (sdkVersion?: string): Promise<DependencyList> => {
  if (sdkVersion) {
    const { sdkVersions } = await Versions.versionsAsync({ skipCache: true });
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
