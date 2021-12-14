import * as Strings from 'app/common/strings';

export const EMAIL_REGEX =
  /^[a-z0-9\u007F-\uffff!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9\u007F-\uffff!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

export const PHONE_REGEX = /^\d{5,}$/;

export const MIN_PASSWORD_LENGTH = 3;
export const MIN_USERNAME_LENGTH = 1;
export const MAX_USERNAME_LENGTH = 128;

export const isPhoneNumber = phoneNumber => {
  if (Strings.isEmptyOrNull(phoneNumber)) {
    return false;
  }

  const testCase = phoneNumber.replace(/[\s()+\-.]|ext/gi, '');

  if (!PHONE_REGEX.test(testCase)) {
    return false;
  }

  return true;
};

export const isEmail = email => {
  if (Strings.isEmptyOrNull(email)) {
    return false;
  }

  if (!EMAIL_REGEX.test(email)) {
    return false;
  }

  return true;
};
