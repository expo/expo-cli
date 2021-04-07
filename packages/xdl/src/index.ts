import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  installSourceMapSupport();
}
export {
  Android,
  Binaries,
  AndroidCredentials,
  Detach,
  Doctor,
  Env,
  EmbeddedAssets,
  Exp,
  ErrorCode,
  StandaloneBuild,
  IosCodeSigning,
  Logger,
  ModuleVersion,
  NotificationCode,
  PackagerLogsStream,
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
  Versions,
  Webpack,
  XDLError,
} from './internal';
