import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  installSourceMapSupport();
}
export {
  Android,
  AppleDevice,
  Binaries,
  AndroidCredentials,
  CoreSimulator,
  Detach,
  Doctor,
  Env,
  EmbeddedAssets,
  ErrorCode,
  isDevClientPackageInstalled,
  IosCodeSigning,
  Logger,
  ModuleVersion,
  NotificationCode,
  printBundleSizes,
  PackagerLogsStream,
  LoadingPageHandler,
  LogRecord,
  LogUpdater,
  PKCS12Utils,
  Project,
  Prompts,
  ProjectSettings,
  ProjectAssets,
  ProjectUtils,
  SimControl,
  Simulator,
  ThirdParty,
  UrlUtils,
  Webpack,
  XDLError,
} from './internal';
