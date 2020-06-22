import { Color } from 'color-string';
import { SplashScreenImageResizeModeType, SplashScreenStatusBarStyleType } from './constants';

/**
 * Type describing generic (platform-agnostic) Splash Screen configuration.
 */
export type GenericSplashScreenConfig = {
  backgroundColor: Color;

  imagePath?: string;
  imageResizeMode?: SplashScreenImageResizeModeType;

  statusBar?: {
    hidden?: boolean;
    style?: SplashScreenStatusBarStyleType;
  };

  darkMode?: {
    backgroundColor?: Color;
    imagePath?: string;
  };
};

/**
 * Specific configuration changes for iOS platform to the generic Splash Screen config type.
 */
type IosSpecificSplashScreenConfig = {};

/**
 * Specific configuration changes for iOS platform to the generic Splash Screen config type.
 */
type AndroidSpecificSplashScreenConfig = {
  statusBar?: {
    translucent?: boolean;
    backgroundColor?: Color;
  };
  darkMode?: {
    statusBar?: {
      style?: SplashScreenStatusBarStyleType;
      backgroundColor?: Color;
    };
  };
};

/**
 * Specific new JSON-friendly types for GenericSplashScreenConfig.
 * @see MapToJsonValues mapped type object description.
 */
type GenericSplashScreenConfigJsonMapper = {
  backgroundColor: string;
  darkMode: {
    backgroundColor: string;
  };
};

/**
 * Specific new JSON-friendly types for IosSplashScreenConfig.
 * @see MapToJsonValues mapped type object description.
 */
type IosSplashScreenConfigJsonMapper = Modify<GenericSplashScreenConfigJsonMapper, {}>;

/**
 * Specific new JSON-friendly types for AndroidSplashScreenConfig.
 * @see MapToJsonValues mapped type object description.
 */
type AndroidSplashScreenConfigJsonMapper = Modify<
  GenericSplashScreenConfigJsonMapper,
  {
    statusBar: {
      backgroundColor: string;
    };
    darkMode: {
      statusBar: {
        backgroundColor: string;
      };
    };
  }
>;

/**
 * Full iOS SplashScreen config.
 */
export type IosSplashScreenConfig = Modify<
  GenericSplashScreenConfig,
  IosSpecificSplashScreenConfig
>;

/**
 * Full Android SplashScreen config.
 */
export type AndroidSplashScreenConfig = Modify<
  GenericSplashScreenConfig,
  AndroidSpecificSplashScreenConfig
>;

/**
 * The very same as `GenericSplashScreenConfig`, but JSON-friendly (values for each property are JavaScript built-in types).
 */
export type GenericSplashScreenJsonConfig = MapToJsonValues<
  GenericSplashScreenConfig,
  GenericSplashScreenConfigJsonMapper
>;

/**
 * The very same as `IosSplashScreenConfig`, but JSON-friendly (values for each property are JavaScript built-in types).
 */
export type IosSplashScreenJsonConfig = MapToJsonValues<
  IosSplashScreenConfig,
  IosSplashScreenConfigJsonMapper
>;

/**
 * The very same as `IosSplashScreenConfig`, but JSON-friendly (values for each property are JavaScript built-in types).
 */
export type AndroidSplashScreenJsonConfig = MapToJsonValues<
  AndroidSplashScreenConfig,
  AndroidSplashScreenConfigJsonMapper
>;

/**
 * Maps object type into object type that has only JSON-acceptable values types.
 * Preserves optionality of fields.
 * Converts every string-based type (union type and enum) into plain string type.
 * You can additionally pass Mapper object (optionality is discarded in this object) that describes some properties new types.
 * @example
 * ```ts
 * type A = {
 *   backgroundColor: [number, number, number, number];
 *   imagePath?: string;
 *   imageResizeMode?: "contain" | "cover" | "native";
 *   statusBar?: {
 *     hidden?: boolean;
 *     style?: "default" | "light-content" | "dark-content";
 *   }
 * }
 * // will be converted into
 * type B = MapToJsonValues<A> = {
 *   backgroundColor: number[];
 *   imagePath?: string;
 *   imageResizeMode?: string;
 *   statusBar?: {
 *     hidden?: boolean;
 *     style?: string;
 *   };
 * }
 * // and if you specify explicit new type for some properties
 * type Mapper = {
 *   backgroundColor: string;
 *   statusBar: {
 *     hidden: number
 *   }
 * }
 * type C = MapToJsonValues<A, Mapper> = {
 *   backgroundColor: string;
 *   imagePath?: string;
 *   imageResizeMode?: string;
 *   statusBar?: {
 *     hidden?: number;
 *     style?: string;
 *   };
 * }
 * ```

 */
export type MapToJsonValues<T, JsonT extends JsonShape<T> = never> = Expand<
  IsNever<
    JsonT,
    Primitify<Extract<T, Primitive>> | MapObjectToJsonValues<Exclude<T, Primitive>, never>,
    JsonT extends Primitive
      ? JsonT
      : MapObjectToJsonValues<Exclude<T, Primitive>, Exclude<JsonT, Primitive>>
  >
>;

type MapObjectToJsonValues<T, JsonT> = Expand<
  {
    // @ts-ignore
    [K in keyof T]: K extends keyof JsonT ? MapToJsonValues<T[K], JsonT[K]> : MapToJsonValues<T[K]>;
  }
>;

/**
 * Make string|number|boolean const unions types generic again
 */
type Primitify<T extends Primitive> = T extends string
  ? string
  : T extends number
  ? number
  : T extends boolean
  ? boolean
  : T;

type SNB = string | number | boolean;
export type JsonShape<T> = IsNever<
  T,
  never,
  Expand<
    | SNB
    | (T extends any[]
        ? Array<JsonShape<T[number]>>
        : T extends object
        ? { [P in keyof T]+?: JsonShape<T[P]> }
        : never)
  >
>;

type Primitive = SNB | bigint | symbol | null | undefined;
/** Like Required but recursive for object properties */
export type DeepRequired<T> = T extends Primitive
  ? NonNullable<T>
  : T extends {}
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : NonNullable<T>;

// https://github.com/microsoft/TypeScript/issues/23182
export type IsNever<T, Positive, Negative> = [T] extends [never] ? Positive : Negative;
export type OptionalPromise<T> = Promise<T> | T;
export type KeyofObject<T> = T extends SNB | any[] ? never : keyof T;

/**
 * Modifies `T` according to new types from `U`.
 */
type Modify<T, U> =
  | Extract<T | U, Primitive>
  | ModifyObject<Exclude<T, Primitive>, Exclude<U, Primitive>>;

type ModifyObject<T, U> = [T] extends [never]
  ? U extends any
    ? ModifyNonUnionObjects<T, U>
    : never
  : [U] extends [never]
  ? T extends any
    ? ModifyNonUnionObjects<T, U>
    : never
  : T extends any
  ? U extends any
    ? ModifyNonUnionObjects<T, U>
    : never
  : never;

type ModifyNonUnionObjects<T, U> = Expand<
  {
    [K in RequiredModifyKeys<T, U>]: K extends keyof T
      ? K extends keyof U
        ? Expand<Modify<T[K], U[K]>>
        : T[K]
      : K extends keyof U
      ? U[K]
      : never;
  } &
    {
      [K in OptionalModifyKeys<T, U>]?: K extends keyof T
        ? K extends keyof U
          ? Expand<Modify<Exclude<T[K], undefined>, Exclude<U[K], undefined>>>
          : T[K]
        : K extends keyof U
        ? U[K]
        : never;
    }
>;

type OptionalModifyKeys<T, U> = OptionalKeys<U> | Exclude<OptionalKeys<T>, RequiredKeys<U>>;

type OptionalKeys<T> = {
  [K in keyof T]-?: T extends Record<K, T[K]> ? never : K;
}[keyof T];
type RequiredKeys<T> = {
  [K in keyof T]-?: T extends Record<K, T[K]> ? K : never;
}[keyof T] &
  keyof T;

type RequiredModifyKeys<T, U> = Exclude<RequiredKeys<T>, OptionalKeys<U>> | RequiredKeys<U>;

type Expand<T> = T extends Primitive ? T : { [K in keyof T]: T[K] };
