import colorString, { Color } from 'color-string';
import * as fs from 'fs-extra';
import { get } from 'lodash';
import path from 'path';

import { NonPrimitiveAndNonArrayKeys, DeepRequired } from './types';

/**
 * @param value Value to be checked.
 * @param availableValues Object storing all available options as values.
 */
export function validateEnumValue<T extends Record<string, string>>(
  value: string,
  availableValues: T
): T[keyof T] {
  if (!Object.values<string>(availableValues).includes(value)) {
    throw new Error(
      `Invalid value '${value}'. Available values are ${Object.values(availableValues)
        .map(v => `"${v}"`)
        .join(' | ')}.`
    );
  }
  return value as T[keyof T];
}

/**
 * @param filePath Relative or absolute path to a file.
 * @returns Absolute path to the valid image file.
 */
export async function validateFileIsPng(filePath: string): Promise<string> {
  const resolvedPath = await validateFileExists(filePath);

  // check if resolvedPath is a readable .png file
  if (path.extname(resolvedPath) !== '.png') {
    throw new Error(
      `Invalid path '${filePath}' - file is not a .png file. Provide a path to a file with .png extension.`
    );
  }
  return resolvedPath;
}

/**
 * @param filePath Relative or absolute path to a file.
 * @returns Absolute path to the resolved file.
 */
export async function validateFileExists(filePath: string): Promise<string> {
  const resolvedPath = path.resolve(filePath);
  if (!(await fs.pathExists(resolvedPath))) {
    throw new Error(
      `Invalid path '${filePath}' - file does not exist. Provide a path to an existing file.`
    );
  }
  return resolvedPath;
}

/**
 * @param value Value to be checked.
 */
export function validateColor(value: string): Color {
  const result = colorString.get(value)?.value;
  if (!result) {
    throw new Error(
      `Invalid value '${value}' - value is not a color string. Provide a valid color string.`
    );
  }
  return result;
}

export function generateValidateEnumValue<T extends Record<string, string>>(availableValues: T) {
  return (value: string) => validateEnumValue(value, availableValues);
}

export function ensurePropertyExists<
  T extends object,
  TK1 extends NonPrimitiveAndNonArrayKeys<DeepRequired<T>>,
  TK2 extends NonPrimitiveAndNonArrayKeys<DeepRequired<T>[TK1]>,
  TK3 extends NonPrimitiveAndNonArrayKeys<DeepRequired<T>[TK1][TK2]>
>(object: T, propertyPath: [TK1] | [TK1, TK2] | [TK1, TK2, TK3]): void {
  const value = get(object, propertyPath, undefined);
  if (value === undefined) {
    throw new Error(
      `Missing a required valid value for '${propertyPath.join(
        '.'
      )}'. Provide a valid value for it to enable this property.`
    );
  }
}
