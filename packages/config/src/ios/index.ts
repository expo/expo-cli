import * as BundleIdenitifer from './BundleIdentifier';
import * as Version from './Version';
import * as Name from './Name';
import * as Scheme from './Scheme';
import * as CustomInfoPlistEntries from './CustomInfoPlistEntries';
import * as UserInterfaceStyle from './UserInterfaceStyle';

import { InfoPlist } from './IosConfig.types';

// We can change this to export * as X with TypeScript 3.8+
// https://devblogs.microsoft.com/typescript/announcing-typescript-3-8-beta/#export-star-as-namespace-syntax
// .. but we should wait for this to be the default VSCode version.
export {
  BundleIdenitifer,
  CustomInfoPlistEntries,
  Name,
  Scheme,
  UserInterfaceStyle,
  Version,
  InfoPlist,
};
