import ExtendableError from 'es6-error';

export default class BuildError extends ExtendableError {
  name = 'BuildError';

  constructor(public message: string) {
    super();
  }
}
