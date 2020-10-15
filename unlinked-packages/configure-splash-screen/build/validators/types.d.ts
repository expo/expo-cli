/**
 * Convert the given type into JSON-friendly equivalent that have the same structure,
 * but for any key the value can either be string | number | boolean.
 */
export declare type JsonShape<T> = IsNever<
  T,
  never,
  | SNB
  | (T extends any[]
      ? JsonShape<T[number]>[]
      : T extends object
      ? {
          [P in keyof T]+?: JsonShape<T[P]>;
        }
      : never)
>;
/**
 * Like Required but recursive for object properties
 */
export declare type DeepRequired<T> = T extends Primitive
  ? NonNullable<T>
  : T extends object
  ? {
      [K in keyof T]-?: DeepRequired<T[K]>;
    }
  : NonNullable<T>;
/**
 * The very same as keyof, but does not count in keys of primitives and arrays (e.g. will not return String.toUpperCase)
 */
export declare type NonPrimitiveAndNonArrayKeys<T> = T extends SNB | any[] ? never : keyof T;
/**
 * @see https://github.com/microsoft/TypeScript/issues/23182
 */
export declare type IsNever<T, Positive, Negative> = [T] extends [never] ? Positive : Negative;
export declare type OptionalPromise<T> = Promise<T> | T;
declare type SNB = string | number | boolean;
declare type Primitive = SNB | bigint | symbol | null | undefined;
export {};
