import path from 'path';

import {
  getHermesBytecodeBundleVersionAsync,
  isHermesBytecodeBundleAsync,
  parseGradleProperties,
} from '../HermesBundler';

describe('parseGradleProperties', () => {
  it('should return array of key-value tuple', () => {
    const content = `
    keyFoo=valueFoo
    keyBar=valueBar
    `;

    expect(parseGradleProperties(content)).toEqual({
      keyFoo: 'valueFoo',
      keyBar: 'valueBar',
    });
  });

  it('should keep "=" in value if there are multiple "="', () => {
    const content = `
    key=a=b=c
    `;

    expect(parseGradleProperties(content)).toEqual({
      key: 'a=b=c',
    });
  });

  it('should exclude comment', () => {
    const content = `
    # This is comment
      # comment with space prefix
    keyFoo=valueFoo
    `;

    expect(parseGradleProperties(content)).toEqual({
      keyFoo: 'valueFoo',
    });
  });
});

describe('getHermesBytecodeBundleVersionAsync', () => {
  it('should return hermes bytecode version 74 for plain.74.hbc', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.74.hbc');
    const result = await getHermesBytecodeBundleVersionAsync(file);
    expect(result).toBe(74);
  });

  it('should throw exception for plain javascript file', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.js');
    await expect(getHermesBytecodeBundleVersionAsync(file)).rejects.toThrow();
  });

  it('should throw exception for nonexistent file', async () => {
    const file = path.join(__dirname, 'fixtures', 'nonexistent.js');
    await expect(isHermesBytecodeBundleAsync(file)).rejects.toThrow();
  });
});

describe('isHermesBytecodeBundleAsync', () => {
  it('should return true for hermes bytecode bundle file', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.74.hbc');
    const result = await isHermesBytecodeBundleAsync(file);
    expect(result).toBe(true);
  });

  it('should return false for plain javascript file', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.js');
    const result = await isHermesBytecodeBundleAsync(file);
    expect(result).toBe(false);
  });

  it('should throw exception for nonexistent file', async () => {
    const file = path.join(__dirname, 'fixtures', 'nonexistent.js');
    await expect(isHermesBytecodeBundleAsync(file)).rejects.toThrow();
  });
});
