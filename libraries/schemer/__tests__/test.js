import Schemer from '../src/index';
import {
  pathToSchema,
  pathToSchemaPath,
  schemaPointerToPath,
} from '../src/Util';
import { ValidationError, ErrorCodes } from '../src/ValidationError.js';

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

describe('Holistic Unit Test', () => {
  it('good example app.json all', async () => {
    await expect(S.validateAll(good)).resolves.toBe(true);
  });

  it('good example app.json schema', async () => {
    await expect(S.validateSchemaAsync(good)).resolves.toBe(true);
  });

  it('bad example app.json schema', async () => {
    try {
      await S.validateSchemaAsync(bad);
    } catch (e) {
      console.log(e);
      expect(e).toBeTruthy();
      expect(e.length).toBe(5);
    }
  });

  it('bad example app.json all', async () => {
    try {
      await S.validateAll(bad);
    } catch (e) {
      expect(e).toBeTruthy();
      expect(e.length).toBe(6);
    }
  });
});

describe('Manual Validation Individual Unit Tests', () => {
  it('Local Icon', async () => {
    await expect(S.validateIcon('./files/check.png')).resolves.toBe(true);
  });

  it('Remote Icon', async () => {
    await expect(
      S.validateIcon(
        'https://upload.wikimedia.org/wikipedia/commons/0/0f/Icon_Pinguin_2_512x512.png'
      )
    ).resolves.toBe(true);
  });

  it('Local Square Icon correct', async () => {
    const S = new Schemer(
      { properties: { icon: { meta: { asset: true, square: true } } } },
      { rootDir: './__tests__' }
    );
    await expect(S.validateIcon('./files/check.png')).resolves.toBe(true);
  });
  it('Remote icon dimensions correct', async () => {
    const S = new Schemer({
      properties: {
        icon: {
          meta: { asset: true, dimensions: { width: 100, height: 100 } },
        },
      },
    });
    await expect(S.validateIcon('https://httpbin.org/image/png')).resolves.toBe(
      true
    );
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
      expect(e.length).toBe(1);
    }
  });

  it('Remote icon dimensions wrong', async () => {
    const S = new Schemer(
      {
        properties: {
          icon: {
            meta: { asset: true, dimensions: { width: 101, height: 100 } },
          },
        },
      },
      { rootDir: './__tests__' }
    );
    try {
      await S.validateIcon('https://httpbin.org/image/png');
    } catch (e) {
      expect(e).toBeTruthy();
      expect(e.length).toBe(1);
    }
  });
});

describe('Individual Unit Tests', async () => {
  it('Error when missing Required Property', async () => {
    let S = new Schemer({
      properties: {
        name: {},
      },
      required: ['name'],
    });
    try {
      await S.validateAll({ noName: '' });
    } catch (e) {
      expect(e.length).toBe(1);
      expect(e[0].errorCode).toBe(ErrorCodes.SCHEMA_MISSING_REQUIRED_PROPERTY);
    }
  });

  it('Error when data has an additional property', async () => {
    let S = new Schemer({ additionalProperties: false });
    try {
      await S.validateAll({ extraProperty: 'extra' });
    } catch (e) {
      expect(e.length).toBe(1);
      expect(e[0].errorCode).toBe(ErrorCodes.SCHEMA_ADDITIONAL_PROPERTY);
    }
  });

  it('Name', async () => {
    await expect(S.validateName('wilson')).resolves.toBe(true);
    await expect(S.validateName([1, 2, 3, 4])).resolves.toBe(false);
    await expect(S.validateName(23.232332)).resolves.toBe(false);
    await expect(S.validateName(/regex.*/)).resolves.toBe(false);
  });

  it('Slug', async () => {
    await expect(S.validateSlug('wilson')).resolves.toBe(true);
    await expect(S.validateSlug(12312123123)).resolves.toBe(false);
    await expect(S.validateSlug([1, 23])).resolves.toBe(false);

    await expect(S.validateSlug('wilson123')).resolves.toBe(true);
    await expect(S.validateSlug('wilson-123')).resolves.toBe(true);
    await expect(S.validateSlug('wilson/test')).resolves.toBe(false);
    await expect(S.validateSlug('wilson-test%')).resolves.toBe(false);
    await expect(
      S.validateSlug('wilson-test-zhao--javascript-is-super-funky')
    ).resolves.toBe(true);
  });

  it('SDK Version', async () => {
    await expect(S.validateSdkVersion('1.0.0')).resolves.toBe(true);
    // TODO: is the following allowed?
    await expect(S.validateSdkVersion('2.0.0.0.1')).resolves.toBe(false);
    await expect(S.validateSdkVersion('UNVERSIONED')).resolves.toBe(true);
    await expect(S.validateSdkVersion('12.2a.3')).resolves.toBe(false);
    await expect(S.validateSdkVersion('9,9,9')).resolves.toBe(false);
    await expect(S.validateSdkVersion('1.2')).resolves.toBe(false);
  });
});
