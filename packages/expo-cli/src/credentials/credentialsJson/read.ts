import fs from 'fs-extra';
import Joi from 'joi';
import path from 'path';

import { Keystore } from '../credentials';

interface CredentialsJson {
  android?: {
    keystore: {
      keystorePath: string;
      keystorePassword: string;
      keyAlias: string;
      keyPassword: string;
    };
  };
  ios?: {
    provisioningProfilePath: string;
    distributionCertificate: {
      path: string;
      password: string;
    };
  };
  experimental?: {
    npmToken?: string;
  };
}

const CredentialsJsonSchema = Joi.object({
  android: Joi.object({
    keystore: Joi.object({
      keystorePath: Joi.string().required(),
      keystorePassword: Joi.string().required(),
      keyAlias: Joi.string().required(),
      keyPassword: Joi.string().required(),
    }),
  }),
  ios: Joi.object({
    provisioningProfilePath: Joi.string().required(),
    distributionCertificate: Joi.object({
      path: Joi.string().required(),
      password: Joi.string().required(),
    }).required(),
  }),
  experimental: Joi.object({
    npmToken: Joi.string(),
  }),
});

interface AndroidCredentials {
  keystore: Keystore;
}

interface iOSCredentials {
  provisioningProfile: string;
  distributionCertificate: {
    certP12: string;
    certPassword: string;
  };
}

export async function fileExistsAsync(projectDir: string): Promise<boolean> {
  return await fs.pathExists(path.join(projectDir, 'credentials.json'));
}

export async function readAndroidCredentialsAsync(projectDir: string): Promise<AndroidCredentials> {
  const credentialsJson = await readAsync(projectDir);
  if (!credentialsJson.android) {
    throw new Error('Android credentials are missing from credentials.json'); // TODO: add fyi
  }
  const keystoreInfo = credentialsJson.android.keystore;
  return {
    keystore: {
      keystore: await fs.readFile(getAbsolutePath(projectDir, keystoreInfo.keystorePath), 'base64'),
      keystorePassword: keystoreInfo.keystorePassword,
      keyAlias: keystoreInfo.keyAlias,
      keyPassword: keystoreInfo.keyPassword,
    },
  };
}

export async function readIosCredentialsAsync(projectDir: string): Promise<iOSCredentials> {
  const credentialsJson = await readAsync(projectDir);
  if (!credentialsJson.ios) {
    throw new Error('iOS credentials are missing from credentials.json'); // TODO: add fyi
  }
  return {
    provisioningProfile: await fs.readFile(
      getAbsolutePath(projectDir, credentialsJson.ios.provisioningProfilePath),
      'base64'
    ),
    distributionCertificate: {
      certP12: await fs.readFile(
        getAbsolutePath(projectDir, credentialsJson.ios.distributionCertificate.path),
        'base64'
      ),
      certPassword: credentialsJson.ios.distributionCertificate.password,
    },
  };
}

export async function readSecretEnvsAsync(
  projectDir: string
): Promise<Record<string, string> | undefined> {
  if (!(await fileExistsAsync(projectDir))) {
    return undefined;
  }
  const credentialsJson = await readAsync(projectDir);
  const npmToken = credentialsJson?.experimental?.npmToken;
  return npmToken ? { NPM_TOKEN: npmToken } : undefined;
}

async function readAsync(projectDir: string): Promise<CredentialsJson> {
  const credentialsJSONRaw = await readRawAsync(projectDir);

  const { value: credentialsJson, error } = CredentialsJsonSchema.validate(credentialsJSONRaw, {
    stripUnknown: true,
    convert: true,
    abortEarly: false,
  });
  if (error) {
    throw new Error(`credentials.json is not valid [${error.toString()}]`);
  }

  return credentialsJson;
}

export async function readRawAsync(projectDir: string): Promise<any> {
  const credentialsJsonFilePath = path.join(projectDir, 'credentials.json');
  try {
    const credentialsJSONContents = await fs.readFile(credentialsJsonFilePath, 'utf8');
    return JSON.parse(credentialsJSONContents);
  } catch (err) {
    throw new Error(
      `credentials.json must exist in the project root directory and contain a valid JSON`
    );
  }
}

const getAbsolutePath = (projectDir: string, filePath: string): string =>
  path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
