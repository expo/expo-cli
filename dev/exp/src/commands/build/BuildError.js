/**
 * @flow
 */

import ExtendableError from 'es6-error';

export default class BuildError extends ExtendableError {
  name: string;
  message: string;

  constructor(message: string) {
    super();
    this.name = 'BuildError';
    this.message = message;
  }
}

export const Codes = {
  ERROR_CREDENTIALS_VALIDATION_USERPASS: 'Username/password is incorrect.',
	ERROR_CREDENTIALS_VALIDATION_TWOFACTOR: 'Two factor authentication is not currently enabled. Coming soon!',
	ERROR_CERT_VALIDATION_NOT_PRESENT: 'ERROR_CERT_VALIDATION_NOT_PRESENT',
	ERROR_CERT_VALIDATION_MAXIMUM_CERTS_REACHED: 'ERROR_CERT_VALIDATION_MAXIMUM_CERTS_REACHED',
};
