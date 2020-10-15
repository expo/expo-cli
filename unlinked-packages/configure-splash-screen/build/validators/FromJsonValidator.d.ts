import type {
  JsonShape,
  OptionalPromise,
  NonPrimitiveAndNonArrayKeys,
  DeepRequired,
  IsNever,
} from './types';
/**
 * This class is responsible for validating configuration object in a form of json and produce validated object based on validating `rules` added via `addRule` method.
 */
export default class FromJsonValidator<From extends JsonShape<To>, To extends object> {
  /**
   *  Records:
   * - keys are stringified array paths to the properties
   * - values are functions accepting
   */
  private rules;
  /**
   * Add rule that determined what property is copied from JSON object into actual validated object.
   * @param name an array describing property path (just like in lodash.get function)
   * @param validatingFunction optional parameter that is responsible for actual type conversion and semantic checking (e.g. check is given string is actually a path or a valid color). Not providing it results in copying over value without any semantic checking.
   */
  addRule<
    TK1 extends NonPrimitiveAndNonArrayKeys<DeepRequired<To>>,
    TK2 extends NonPrimitiveAndNonArrayKeys<DeepRequired<To>[TK1]>,
    TK3 extends NonPrimitiveAndNonArrayKeys<DeepRequired<To>[TK1][TK2]>
  >(
    name: [TK1] | [TK1, TK2] | [TK1, TK2, TK3],
    validatingFunction?: (
      value: IsNever<
        TK3,
        IsNever<TK2, DeepRequired<From>[TK1], DeepRequired<From>[TK1][TK2]>,
        DeepRequired<From>[TK1][TK2][TK3]
      >,
      config: To
    ) => OptionalPromise<
      IsNever<
        TK3,
        IsNever<TK2, DeepRequired<To>[TK1], DeepRequired<To>[TK1][TK2]>,
        DeepRequired<To>[TK1][TK2][TK3]
      >
    >
  ): this;
  validate(jsonConfig: From): Promise<To>;
  private formatErrors;
}
