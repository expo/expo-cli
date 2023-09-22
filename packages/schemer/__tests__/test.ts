import { ErrorCodes, SchemerError } from '../src/Error';
import Schemer from '../src/index';
import good from './files/app.json';
import bad from './files/bad.json';
import badWithNot from './files/badwithnot.json';
import invalidAppIcon from './files/invalidAppIcon.json';
import schema from './files/schema.json';

const S = new Schemer(schema.schema, { rootDir: './__tests__' });

describe('Sanity Tests', () => {
  it('is a class', () => {
    const schema = require('./files/schema.json');
    const S = new Schemer(schema);
    expect(S instanceof Schemer).toBe(true);
  });

  it('has public functions', () => {
    const schema = require('./files/schema.json');
    const S = new Schemer(schema);
    expect(S.validateAll).toBeDefined();
    expect(S.validateProperty).toBeDefined();
  });
});

describe('Holistic Unit Test', () => {
  it('good example app.json all', async () => {
    expect(await S.validateAll(good)).toEqual(undefined);
  });

  it('good example app.json schema', async () => {
    expect(await S.validateSchemaAsync(good)).toEqual(undefined);
  });

  it('bad example app.json schema', async () => {
    try {
      await S.validateSchemaAsync(bad);
    } catch (e) {
      expect(e).toBeInstanceOf(SchemerError);
      const errors = e.errors;
      expect(errors.length).toBe(4);
      expect(
        errors.map(validationError => {
          const { stack, ...rest } = validationError;
          return rest;
        })
      ).toMatchSnapshot();
    }
  });

  it('bad example app.json schema with field with not', async () => {
    try {
      await S.validateSchemaAsync(badWithNot);
    } catch (e) {
      expect(e).toBeInstanceOf(SchemerError);
      const errors = e.errors;
      expect(errors.length).toBe(1);
      expect(
        errors.map(validationError => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { stack, ...rest } = validationError;
          return rest;
        })
      ).toMatchSnapshot();
    }
  });

  it('bad example app.json - invalid path for app icon', async () => {
    try {
      await S.validateAll(invalidAppIcon);
    } catch (e) {
      expect(e).toBeInstanceOf(SchemerError);
      const errors = e.errors;
      expect(errors.length).toBe(1);
      expect(
        errors.map(validationError => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { stack, ...rest } = validationError;
          return rest;
        })
      ).toMatchSnapshot();
    }
  });
});

describe('Manual Validation Individual Unit Tests', () => {
  it('Local Icon', async () => {
    expect(await S.validateIcon('./files/check.png')).toEqual(undefined);
  });

  it('Local Square Icon correct', async () => {
    const S = new Schemer(
      { properties: { icon: { meta: { asset: true, square: true } } } },
      { rootDir: './__tests__' }
    );
    expect(await S.validateIcon('./files/check.png')).toEqual(undefined);
  });

  it('Local icon dimensions wrong', async () => {
    const S = new Schemer({
      properties: {
        icon: {
          meta: { asset: true, dimensions: { width: 400, height: 401 } },
        },
      },
    });
    try {
      await S.validateIcon('./files/check.png');
    } catch (e) {
      expect(e).toBeTruthy();
      expect(e.errors.length).toBe(1);
      expect(
        e.map(validationError => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { stack, ...rest } = validationError;
          return rest;
        })
      ).toMatchSnapshot();
    }
  });
});

describe('Individual Unit Tests', () => {
  it('Error when missing Required Property', async () => {
    const S = new Schemer({
      properties: {
        name: {},
      },
      required: ['name'],
    });
    try {
      await S.validateAll({ noName: '' });
    } catch (e) {
      expect(e.errors.length).toBe(1);
      expect(e.errors[0].errorCode).toBe(ErrorCodes.SCHEMA_MISSING_REQUIRED_PROPERTY);
      expect(
        e.errors.map(validationError => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { stack, ...rest } = validationError;
          return rest;
        })
      ).toMatchSnapshot();
    }
  });

  it('Error when data has an additional property', async () => {
    const S = new Schemer({ additionalProperties: false });
    try {
      await S.validateAll({ extraProperty: 'extra' });
    } catch (e) {
      expect(e.errors.length).toBe(1);
      expect(e.errors[0].errorCode).toBe(ErrorCodes.SCHEMA_ADDITIONAL_PROPERTY);
      expect(
        e.errors.map(validationError => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { stack, ...rest } = validationError;
          return rest;
        })
      ).toMatchSnapshot();
    }
  });

  it.each`
    name            | expectedError
    ${'wilson'}     | ${undefined}
    ${[1, 2, 3, 4]} | ${'must be string'}
    ${23.232332}    | ${'must be string'}
    ${/regex.*/}    | ${'must be string'}
  `('validates name: $name', async ({ name, expectedError }) => {
    try {
      expect(await S.validateName(name)).toBe(undefined);
    } catch (e) {
      expect(e.message).toBe(expectedError);
    }
  });

  it.each`
    slug                                             | expectedError
    ${'wilson'}                                      | ${undefined}
    ${12312123123}                                   | ${'must be string'}
    ${[1, 23]}                                       | ${'must be string'}
    ${'wilson123'}                                   | ${undefined}
    ${'wilson-123'}                                  | ${undefined}
    ${'wilson/test'}                                 | ${'\'\' must match pattern "^[a-zA-Z0-9_\\-]+$"'}
    ${'wilson-test%'}                                | ${'\'\' must match pattern "^[a-zA-Z0-9_\\-]+$"'}
    ${'wilson-test-zhao--javascript-is-super-funky'} | ${undefined}
  `('validates slug: $slug', async ({ slug, expectedError }) => {
    try {
      expect(await S.validateSlug(slug)).toBe(undefined);
    } catch (e) {
      expect(e.message).toBe(expectedError);
    }
  });

  it.each`
    sdkVersion       | expectedError
    ${'1.0.0'}       | ${undefined}
    ${'2.0.0.0.1'}   | ${'must be string'}
    ${'UNVERSIONED'} | ${'must be string'}
    ${'12.2a.3'}     | ${'\'\' must match pattern "^(\\d+\\.\\d+\\.\\d+)|(UNVERSIONED)$"'}
    ${'9,9,9'}       | ${'\'\' must match pattern "^(\\d+\\.\\d+\\.\\d+)|(UNVERSIONED)$"'}
    ${'1.2'}         | ${'\'\' must match pattern "^(\\d+\\.\\d+\\.\\d+)|(UNVERSIONED)$"'}
  `('validates SDK version: $sdkVersion', async ({ sdkVersion, expectedError }) => {
    try {
      expect(await S.validateSdkVersion(sdkVersion)).toBe(undefined);
    } catch (e) {
      expect(e.message).toBe(expectedError);
    }
  });
});
