/* eslint-disable import/order */

import { ErrorCodes, SchemerError } from '../src/Error';
import Schemer from '../src/index';

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

const schema = require('./files/schema.json').schema;
const S = new Schemer(schema, { rootDir: './__tests__' });
const good = require('./files/app.json');
const bad = require('./files/bad.json');
const badWithNot = require('./files/badwithnot.json');

describe('Holistic Unit Test', () => {
  it('good example app.json all', async () => {
    await expect(S.validateAll(good)).resolves;
  });

  it('good example app.json schema', async () => {
    await expect(S.validateSchemaAsync(good)).resolves;
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
});

describe('Manual Validation Individual Unit Tests', () => {
  it('Local Icon', async () => {
    await expect(S.validateIcon('./files/check.png')).resolves;
  });

  it('Local Square Icon correct', async () => {
    const S = new Schemer({ properties: { icon: { meta: { asset: true, square: true } } } });
    await expect(S.validateIcon('./files/check.png')).resolves;
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
    }
  });

  it('Error when data has an additional property', async () => {
    const S = new Schemer({ additionalProperties: false });
    try {
      await S.validateAll({ extraProperty: 'extra' });
    } catch (e) {
      expect(e.errors.length).toBe(1);
      expect(e.errors[0].errorCode).toBe(ErrorCodes.SCHEMA_ADDITIONAL_PROPERTY);
    }
  });

  it('Name', async () => {
    await expect(S.validateName('wilson')).resolves;
    await expect(S.validateName([1, 2, 3, 4])).rejects.toBeDefined();
    await expect(S.validateName(23.232332)).rejects.toBeDefined();
    await expect(S.validateName(/regex.*/)).rejects.toBeDefined();
  });

  xit('Slug', async () => {
    await expect(S.validateSlug('wilson')).resolves;
    await expect(S.validateSlug(12312123123)).rejects.toBeDefined();
    await expect(S.validateSlug([1, 23])).rejects.toBeDefined();

    await expect(S.validateSlug('wilson123')).resolves;
    await expect(S.validateSlug('wilson-123')).resolves;
    await expect(S.validateSlug('wilson/test')).rejects.toBeDefined();
    await expect(S.validateSlug('wilson-test%')).rejects.toBeDefined();
    await expect(S.validateSlug('wilson-test-zhao--javascript-is-super-funky')).resolves;
  });

  xit('SDK Version', async () => {
    await expect(S.validateSdkVersion('1.0.0')).resolves;
    // TODO: is the following allowed?
    await expect(S.validateSdkVersion('2.0.0.0.1')).rejects.toBeDefined();
    await expect(S.validateSdkVersion('UNVERSIONED')).resolves;
    await expect(S.validateSdkVersion('12.2a.3')).rejects.toBeDefined();
    await expect(S.validateSdkVersion('9,9,9')).rejects.toBeDefined();
    await expect(S.validateSdkVersion('1.2')).rejects.toBeDefined();
  });
});
