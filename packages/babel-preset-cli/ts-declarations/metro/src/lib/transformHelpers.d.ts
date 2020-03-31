import { JsTransformOptions as TransformOptions } from '../JsTransformer/worker';

export type TransformInputOptions = Pick<
  TransformOptions,
  Exclude<keyof TransformOptions, 'inlinePlatform' | 'inlineRequires'>
>;
