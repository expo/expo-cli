import fetch from 'node-fetch';

/** Represents version info for a particular SDK. */
export type SDKVersion = {
  /** @example "2.16.1" */
  iosVersion?: string;
  /** @example "https://dpq5q02fu5f55.cloudfront.net/Exponent-2.17.4.tar.gz" */
  iosClientUrl?: string;
  /** @example "https://dev.to/expo/expo-sdk-38-is-now-available-5aa0" */
  releaseNoteUrl?: string;
  /** @example "2.17.4" */
  iosClientVersion?: string;
  /** @example "https://d1ahtucjixef4r.cloudfront.net/Exponent-2.16.1.apk" */
  androidClientUrl?: string;
  /** @example "2.16.1" */
  androidClientVersion?: string;
  /** @example { "typescript": "~3.9.5" } */
  relatedPackages?: Record<string, string>;

  facebookReactNativeVersion: string;

  facebookReactVersion?: string;

  beta?: boolean;
};

export type SDKVersions = Record<string, SDKVersion>;

export type Versions = {
  androidUrl: string;
  androidVersion: string;
  iosUrl: string;
  iosVersion: string;
  sdkVersions: SDKVersions;
};

/** Get versions from remote endpoint. */
export async function getVersionsAsync(): Promise<Versions> {
  const results = await fetch(`https://api.expo.dev/v2/versions/latest`);
  const json = await results.json();
  return json.data;
}
