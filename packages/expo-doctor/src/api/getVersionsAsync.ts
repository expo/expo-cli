import fetch from 'node-fetch';

/** Represents version info for a particular SDK. */
export type SDKVersion = {
  /** @example { "typescript": "~3.9.5" } */
  relatedPackages?: Record<string, string>;

  facebookReactNativeVersion: string;

  facebookReactVersion?: string;

  beta?: boolean;
};

export type SDKVersions = Record<string, SDKVersion>;

export type Versions = {
  sdkVersions: SDKVersions;
};

/** Get versions from remote endpoint. */
export async function getVersionsAsync(): Promise<Versions> {
  const results = await fetch(`https://api.expo.dev/v2/versions/latest`);
  const json = await results.json();
  return json.data;
}
