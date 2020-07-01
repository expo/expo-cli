import path from 'path';

import Joi from '@hapi/joi';
import { Platform } from '@expo/build-tools';
import fs from 'fs-extra';

// TODO(wkozyra95): move it to @expo/config or to separate package

// Workflow is representing different value than BuildType from @expo/build-toold
// Each workflow has a set of BuildTypes available
// - Generic workflow allows to build 'generic' and 'generic-client'
// - Managed workflow allows to build 'managed' and 'managed-client'
export enum Workflow {
  Generic = 'generic',
  Managed = 'managed',
}

export enum CredentialsSource {
  LOCAL = 'local',
  REMOTE = 'remote',
  AUTO = 'auto',
}

export interface AndroidManagedBuildProfile {
  workflow: Workflow.Managed;
  credentialsSource: CredentialsSource;
  buildType?: 'app-bundle' | 'apk';
}

export interface AndroidGenericBuildProfile {
  workflow: Workflow.Generic;
  credentialsSource: CredentialsSource;
  buildCommand?: string;
  artifactPath?: string;
  withoutCredentials?: boolean;
}

export interface iOSManagedBuildProfile {
  workflow: Workflow.Managed;
  credentialsSource: CredentialsSource;
  buildType?: 'archive' | 'simulator';
}

export interface iOSGenericBuildProfile {
  workflow: Workflow.Generic;
  credentialsSource: CredentialsSource;
}

export type AndroidBuildProfile = AndroidManagedBuildProfile | AndroidGenericBuildProfile;
export type iOSBuildProfile = iOSManagedBuildProfile | iOSGenericBuildProfile;

interface EasJson {
  builds: {
    android?: { [key: string]: AndroidManagedBuildProfile | AndroidGenericBuildProfile };
    ios?: { [key: string]: iOSManagedBuildProfile | iOSGenericBuildProfile };
  };
}

// EasConfig represents eas.json with one specific profile
export interface EasConfig {
  builds: {
    android?: AndroidManagedBuildProfile | AndroidGenericBuildProfile;
    ios?: iOSManagedBuildProfile | iOSGenericBuildProfile;
  };
}

const EasJsonSchema = Joi.object({
  builds: Joi.object({
    android: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        workflow: Joi.string().valid('generic', 'managed').required(),
      }).unknown(true) // profile is validated further only if build is for that platform
    ),
    ios: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        workflow: Joi.string().valid('generic', 'managed').required(),
      }).unknown(true) // profile is validated further only if build is for that platform
    ),
  }),
});

const AndroidGenericSchema = Joi.object({
  workflow: Joi.string().valid('generic').required(),
  credentialsSource: Joi.string().valid('local', 'remote', 'auto').default('auto'),
  buildCommand: Joi.string(),
  artifactPath: Joi.string(),
  withoutCredentials: Joi.boolean(),
});

const AndroidManagedSchema = Joi.object({
  workflow: Joi.string().valid('managed').required(),
  credentialsSource: Joi.string().valid('local', 'remote', 'auto').default('auto'),
  buildType: Joi.string().valid('apk', 'app-bundle'),
});

const iOSGenericSchema = Joi.object({
  workflow: Joi.string().valid('generic').required(),
  credentialsSource: Joi.string().valid('local', 'remote', 'auto').default('auto'),
});
const iOSManagedSchema = Joi.object({
  workflow: Joi.string().valid('managed').required(),
  credentialsSource: Joi.string().valid('local', 'remote', 'auto').default('auto'),
  buildType: Joi.string().valid('archive', 'simulator'),
});

const schemaBuildProfileMap: Record<string, Record<string, Joi.Schema>> = {
  android: {
    generic: AndroidGenericSchema,
    managed: AndroidManagedSchema,
  },
  ios: {
    managed: iOSManagedSchema,
    generic: iOSGenericSchema,
  },
};

export class EasJsonReader {
  constructor(private projectDir: string, private platform: 'android' | 'ios' | 'all') {}

  public async readAsync(buildProfileName: string): Promise<EasConfig> {
    const easJson = await this.readFile();

    let androidConfig;
    if (['android', 'all'].includes(this.platform)) {
      androidConfig = this.validateBuildProfile<AndroidBuildProfile>(
        Platform.Android,
        buildProfileName,
        easJson.builds?.android?.[buildProfileName]
      );
    }
    let iosConfig;
    if (['ios', 'all'].includes(this.platform)) {
      iosConfig = this.validateBuildProfile<iOSBuildProfile>(
        Platform.iOS,
        buildProfileName,
        easJson.builds?.ios?.[buildProfileName]
      );
    }
    return {
      builds: {
        ...(androidConfig ? { android: androidConfig } : {}),
        ...(iosConfig ? { ios: iosConfig } : {}),
      },
    };
  }

  private validateBuildProfile<T>(
    platform: 'android' | 'ios' | 'all',
    buildProfileName: string,
    buildProfile?: any
  ): T {
    if (!buildProfile) {
      throw new Error(`There is no profile named ${buildProfileName} for platform ${platform}`);
    }
    const schema = schemaBuildProfileMap[platform][buildProfile?.workflow];
    if (!schema) {
      throw new Error('invalid workflow'); // this should be validated earlier
    }
    const { value, error } = schema.validate(buildProfile, {
      stripUnknown: true,
      convert: true,
      abortEarly: false,
    });

    if (error) {
      throw new Error(
        `Object "${platform}.${buildProfileName}" in eas.json is not valid [${error.toString()}]`
      );
    }
    return value;
  }

  private async readFile(): Promise<EasJson> {
    const rawFile = await fs.readFile(path.join(this.projectDir, 'eas.json'), 'utf-8');
    const json = JSON.parse(rawFile);

    const { value, error } = EasJsonSchema.validate(json, {
      abortEarly: false,
    });

    if (error) {
      throw new Error(`eas.json is not valid [${error.toString()}]`);
    }
    return value;
  }
}
