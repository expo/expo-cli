export default class BuildError extends Error {
  name = 'BuildError';

  constructor(public message: string) {
    super();
  }
}
BuildError.prototype.name = BuildError.name;
