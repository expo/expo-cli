/**
 * A complex babel loader which uses the project's `babel.config.js`
 * to resolve all of the Unimodules which are shipped as ES modules (early 2019).
 */
export default function createBabelLoaderAsync({ 
/**
 * The webpack mode: `"production" | "development"`
 */
mode, babelProjectRoot, include, verbose, ...options }?: {
    mode: any;
    babelProjectRoot: any;
    include?: never[] | undefined;
    verbose: any;
}): Promise<{
    include(inputPath: any): any;
    use: any;
    test: RegExp;
}>;
