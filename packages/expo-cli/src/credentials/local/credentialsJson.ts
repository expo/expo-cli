import path from 'path';

import Joi from '@hapi/joi';
import fs from 'fs-extra';

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

async function fileExistsAsync(projectDir: string): Promise<boolean> {
  return await fs.pathExists(path.join(projectDir, 'credentials.json'));
}

async function readAndroidAsync(projectDir: string): Promise<AndroidCredentials> {
  const credentialsJson = await readAsync(projectDir);
  if (!credentialsJson.android) {
    throw new Error('Android credentials are missing from credentials.json'); // TODO: add fyi
  }
  const keystoreInfo = credentialsJson.android.keystore;
  return {
    keystore: {
      keystore: await fs.readFile(keystoreInfo.keystorePath, 'base64'),
      keystorePassword: keystoreInfo.keystorePassword,
      keyAlias: keystoreInfo.keyAlias,
      keyPassword: keystoreInfo.keyPassword,
    },
  };
}

async function readIosAsync(projectDir: string): Promise<iOSCredentials> {
  const credentialsJson = await readAsync(projectDir);
  if (!credentialsJson.ios) {
    throw new Error('iOS credentials are missing from credentials.json'); // TODO: add fyi
  }
  return {
    provisioningProfile: await fs.readFile(credentialsJson.ios.provisioningProfilePath, 'base64'),
    distributionCertificate: {
      certP12: await fs.readFile(credentialsJson.ios.distributionCertificate.path, 'base64'),
      certPassword: credentialsJson.ios.distributionCertificate.password,
    },
  };
}

async function readAsync(projectDir: string): Promise<CredentialsJson> {
  const credentialsJsonFilePath = path.join(projectDir, 'credentials.json');
  let credentialsJSONRaw;
  try {
    const credentialsJSONContents = await fs.readFile(credentialsJsonFilePath, 'utf8');
    credentialsJSONRaw = JSON.parse(credentialsJSONContents);
  } catch (err) {
    throw new Error(
      `credentials.json must exist in the project root directory and consist a valid JSON`
    );
  }

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

export default { readAndroidAsync, readIosAsync, fileExistsAsync };
