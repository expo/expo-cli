import { assert, IsExact } from 'conditional-type-checks';

/**
 * Convert the given type into JSON-friendly equivalent that have the same structure,
 * but for any key the value can either be string | number | boolean.
 */
export type JsonShape<T> = IsNever<
  T,
  never,
  | SNB
  | (T extends any[]
      ? JsonShape<T[number]>[]
      : T extends object
      ? { [P in keyof T]+?: JsonShape<T[P]> }
      : never)
>;

/**
 * Like Required but recursive for object properties
 */
export type DeepRequired<T> = T extends Primitive
  ? NonNullable<T>
  : T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : NonNullable<T>;

/**
 * The very same as keyof, but does not count in keys of primitives and arrays (e.g. will not return String.toUpperCase)
 */
export type NonPrimitiveAndNonArrayKeys<T> = T extends SNB | any[] ? never : keyof T;

/**
 * @see https://github.com/microsoft/TypeScript/issues/23182
 */
export type IsNever<T, Positive, Negative> = [T] extends [never] ? Positive : Negative;

export type OptionalPromise<T> = Promise<T> | T;
type SNB = string | number | boolean;
type Primitive = SNB | bigint | symbol | null | undefined;

// -------------------- //
// type testing section //
// -------------------- //

type _TestType = {
  n: number;
  s?: string;
  b?: boolean;
  a_n: number[];
  t_s: [string, string];
  o: {
    n?: number;
  };

  o_n?: {
    o: {
      s: string;
    };
  };
};

type _TestTypeJSON = JsonShape<_TestType>;

assert<
  IsExact<
    _TestTypeJSON,
    | SNB
    | Partial<{
        n: SNB;
        s: SNB;
        b: SNB;
        a_n: SNB | SNB[];
        t_s: SNB | SNB[];
        o: SNB | Partial<{ n: SNB }>;
        o_n:
          | SNB
          | Partial<{
              o: SNB | Partial<{ s?: SNB }>;
            }>;
      }>
  >
>(true);
