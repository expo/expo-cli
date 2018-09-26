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
