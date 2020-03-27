import * as Branch from './Branch';
import * as BundleIdenitifer from './BundleIdentifier';
import * as DeviceFamily from './DeviceFamily';
import * as Version from './Version';
import * as Name from './Name';
import * as Scheme from './Scheme';
import * as CustomInfoPlistEntries from './CustomInfoPlistEntries';
import * as UserInterfaceStyle from './UserInterfaceStyle';
import * as RequiresFullScreen from './RequiresFullScreen';
import * as UsesNonExemptEncryption from './UsesNonExemptEncryption';
import * as Entitlements from './Entitlements';
import * as Facebook from './Facebook';
import * as Google from './Google';

// Placeholders
import * as Icons from './Icons';
import * as SplashScreen from './SplashScreen';
import * as Locales from './Locales';

import { InfoPlist } from './IosConfig.types';

// We can change this to export * as X with TypeScript 3.8+
// https://devblogs.microsoft.com/typescript/announcing-typescript-3-8-beta/#export-star-as-namespace-syntax
// .. but we should wait for this to be the default VSCode version.
export {
  Branch,
  BundleIdenitifer,
  CustomInfoPlistEntries,
  DeviceFamily,
  Entitlements,
  Facebook,
  Google,
  Icons,
  Locales,
  SplashScreen,
  InfoPlist,
  Name,
  RequiresFullScreen,
  Scheme,
  UserInterfaceStyle,
  UsesNonExemptEncryption,
  Version,
};
