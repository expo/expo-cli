import {
  AndroidBuildProfile,
  CredentialsSource,
  Workflow,
  iOSBuildProfile,
} from '../../../easJson';
import { CommandContext } from './types';

/**
 * We use require() to exclude package.json from TypeScript's analysis since it lives outside
 * the src directory and would change the directory structure of the emitted files
 * under the build directory
 */
const packageJSON = require('../../../../package.json');

export type BuildMetadata = {
  /**
   * Application version (the expo.version key in app.json/app.config.js)
   */
  appVersion: string;

  /**
   * Expo CLI version
   */
  cliVersion: string;

  /**
   * Build workflow
   * It's either 'generic' or 'managed'
   */
  workflow: Workflow;

  /**
   * Credentials source
   * Credentials could be obtained either from credential.json or Expo servers.
   * Auto mode means that both sources will be checked.
   */
  credentialsSource: CredentialsSource;

  /**
   * Expo SDK version
   * It's determined by the expo package version in package.json.
   * It's undefined if the expo package is not installed for the project.
   */
  sdkVersion?: string;

  /**
   * Release channel (for expo-updates)
   * It's undefined if the expo-updates package is not installed for the project.
   */
  releaseChannel?: string;
};

async function collectMetadata<T extends AndroidBuildProfile | iOSBuildProfile>(
  commandCtx: CommandContext,
  buildProfile: T
): Promise<BuildMetadata> {
  return {
    appVersion: commandCtx.exp.version,
    cliVersion: packageJSON.version,
    workflow: buildProfile.workflow,
    credentialsSource: buildProfile.credentialsSource,
    sdkVersion: commandCtx.exp.sdkVersion,
  };
}

export { collectMetadata };
