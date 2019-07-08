/**
 * Given a config option that could evalutate to true, config, or null; return a config.
 * e.g.
 * `polyfill: true` returns the `config`
 * `polyfill: {}` returns `{}`
 */
export declare function enableWithPropertyOrConfig(prop: any, config: {
    [key: string]: any;
}, merge?: boolean): any;
/**
 * Used for features that are enabled by default unless specified otherwise.
 */
export declare function overrideWithPropertyOrConfig(prop: any, config: {
    [key: string]: any;
}, merge?: boolean): any;
