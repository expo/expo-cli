import ApiV2, { ApiV2ClientOptions } from './ApiV2';

export interface NativeModule {
  npmPackage: string;
  versionRange: string;
}
export type BundledNativeModuleList = NativeModule[];

/**
 * The endpoint returns the list of bundled native modules for a given SDK version.
 * The data is populated by the `et sync-bundled-native-modules` script from expo/expo repo.
 * See the code for more details:
 * https://github.com/expo/expo/blob/master/tools/src/commands/SyncBundledNativeModules.ts
 *
 * Example result:
 * [
 *   {
 *     id: "79285187-e5c4-47f7-b6a9-664f5d16f0db",
 *     sdkVersion: "41.0.0",
 *     npmPackage: "expo-analytics-amplitude",
 *     versionRange: "~10.1.0",
 *     createdAt: "2021-04-29T09:34:32.825Z",
 *     updatedAt: "2021-04-29T09:34:32.825Z"
 *   },
 *   ...
 * ]
 */
export async function getBundledNativeModulesFromApiAsync(
  user: ApiV2ClientOptions | null,
  sdkVersion: string
): Promise<Record<string, string>> {
  const list = (await ApiV2.clientForUser(user).getAsync(
    `sdks/${sdkVersion}/native-modules`
  )) as BundledNativeModuleList;
  if (list.length === 0) {
    throw new Error('The bundled native module list from www is empty');
  }

  return list.reduce((acc, i) => {
    acc[i.npmPackage] = i.versionRange;
    return acc;
  }, {} as Record<string, string>);
}
