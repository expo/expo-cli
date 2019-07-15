import JsonFileError from '../src/JsonFileError';

describe('JsonFileError', () => {
  it(`is an error`, () => {
    let error = new JsonFileError('Example');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof JsonFileError).toBe(true);
  });

  it(`has a flag that says it's a JsonFileError`, () => {
    let error = new JsonFileError('Example');
    expect(error.isJsonFileError).toBe(true);
  });

  it(`includes its cause`, () => {
    let cause = new Error('Root cause');
    let error = new JsonFileError('Example', cause);
    expect(error.cause).toBe(cause);
    expect(error.message).toMatch(cause.message);
  });
});
