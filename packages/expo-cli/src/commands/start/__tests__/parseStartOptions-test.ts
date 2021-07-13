import { parseRawArguments, setBooleanArg } from '../parseStartOptions';

describe(setBooleanArg, () => {
  it(`uses fallback`, () => {
    expect(setBooleanArg('dev', [], true)).toBe(true);
  });
  it(`uses true value first`, () => {
    expect(setBooleanArg('dev', ['--no-dev', '--dev'])).toBe(true);
  });
  it(`uses false value`, () => {
    expect(setBooleanArg('dev', ['--no-dev'])).toBe(false);
  });
});

describe(parseRawArguments, () => {
  it(`args overwrite incoming options`, () => {
    expect(
      parseRawArguments(
        {
          dev: true,
        },
        ['--no-dev']
      ).dev
    ).toBe(false);

    expect(
      parseRawArguments(
        {
          dev: false,
        },
        []
      ).dev
    ).toBe(true);
  });
});
