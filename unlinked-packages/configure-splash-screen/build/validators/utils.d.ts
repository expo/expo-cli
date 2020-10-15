import { Color } from 'color-string';
import { NonPrimitiveAndNonArrayKeys, DeepRequired } from './types';
/**
 * @param value Value to be checked.
 * @param availableValues Object storing all available options as values.
 */
export declare function validateEnumValue<T extends Record<string, string>>(
  value: string,
  availableValues: T
): T[keyof T];
/**
 * @param filePath Relative or absolute path to a file.
 * @returns Absolute path to the valid image file.
 */
export declare function validateFileIsPng(filePath: string): Promise<string>;
/**
 * @param filePath Relative or absolute path to a file.
 * @returns Absolute path to the resolved file.
 */
export declare function validateFileExists(filePath: string): Promise<string>;
/**
 * @param value Value to be checked.
 */
export declare function validateColor(value: string): Color;
export declare function generateValidateEnumValue<T extends Record<string, string>>(
  availableValues: T
): (value: string) => T[keyof T];
export declare function ensurePropertyExists<
  T extends object,
  TK1 extends NonPrimitiveAndNonArrayKeys<DeepRequired<T>>,
  TK2 extends NonPrimitiveAndNonArrayKeys<DeepRequired<T>[TK1]>,
  TK3 extends NonPrimitiveAndNonArrayKeys<DeepRequired<T>[TK1][TK2]>
>(object: T, propertyPath: [TK1] | [TK1, TK2] | [TK1, TK2, TK3]): void;
