import mapValues from 'lodash/mapValues';
import isObject from 'lodash/isObject';
import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import fs from 'fs-extra';
import { BuilderOptions } from '../../../BaseBuilder.types';

export type UserParameters = {
  distributionCert?: string;
  certP12?: string;
  certPassword?: string;
  pushKey?: string;
  apnsKeyP8?: string;
  apnsKeyId?: string;
  provisioningProfile?: string;
};

async function getFromParams(
  options: Pick<BuilderOptions, 'distP12Path' | 'pushP8Path' | 'pushId' | 'provisioningProfilePath'>
): Promise<UserParameters> {
  const distPassword = process.env.EXPO_IOS_DIST_P12_PASSWORD;
  const { distP12Path, pushP8Path, pushId, provisioningProfilePath } = options;

  if (_isOnlyOneSet(distP12Path, distPassword)) {
    throw new Error(
      'You have to both pass --dist-p12-path parameter and set EXPO_IOS_DIST_P12_PASSWORD environment variable.'
    );
  }

  if (_isOnlyOneSet(pushP8Path, pushId)) {
    throw new Error('You have to pass both --push-p8-path and --push-id parameters.');
  }

  const all = {
    distributionCert: {
      certP12: distP12Path && (await fs.readFile(distP12Path, 'base64')),
      certPassword: distPassword,
    },
    pushKey: {
      apnsKeyP8: pushP8Path && (await fs.readFile(pushP8Path, 'utf8')),
      apnsKeyId: pushId,
    },
    provisioningProfile:
      provisioningProfilePath && (await fs.readFile(provisioningProfilePath, 'base64')),
  };
  const withoutEmptyObjects = mapValues(all, value => {
    if (isObject(value)) {
      const cleanedValue = pickBy(value);
      return isEmpty(cleanedValue) ? null : cleanedValue;
    } else {
      return value;
    }
  });
  return pickBy(withoutEmptyObjects);
}

const _isOnlyOneSet = (a: any, b: any): boolean => (a && !b) || (b && !a);

export default getFromParams;
