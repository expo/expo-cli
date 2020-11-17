export default class BuildError extends Error {
  readonly name = 'BuildError';

  constructor(public message: string) {
    super();
  }
}
