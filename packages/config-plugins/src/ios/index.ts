import * as Branch from './Branch';
import * as BundleIdenitifer from './BundleIdentifier';
import * as CustomInfoPlistEntries from './CustomInfoPlistEntries';
import * as DeviceFamily from './DeviceFamily';
import * as Entitlements from './Entitlements';
import * as Facebook from './Facebook';
import * as Google from './Google';
import * as Icons from './Icons';
import { ExpoPlist, InfoPlist } from './IosConfig.types';
import * as Locales from './Locales';
import * as Name from './Name';
import * as Orientation from './Orientation';
import * as Paths from './Paths';
import * as Permissions from './Permissions';
import * as ProvisioningProfile from './ProvisioningProfile';
import * as RequiresFullScreen from './RequiresFullScreen';
import * as Scheme from './Scheme';
import * as SplashScreen from './SplashScreen';
import * as Updates from './Updates';
import * as UserInterfaceStyle from './UserInterfaceStyle';
import * as UsesNonExemptEncryption from './UsesNonExemptEncryption';
import * as Version from './Version';
import * as XcodeUtils from './utils/Xcodeproj';

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
  ExpoPlist,
  Name,
  Orientation,
  Paths,
  ProvisioningProfile,
  Permissions,
  RequiresFullScreen,
  Scheme,
  Updates,
  UserInterfaceStyle,
  UsesNonExemptEncryption,
  Version,
  XcodeUtils,
};
