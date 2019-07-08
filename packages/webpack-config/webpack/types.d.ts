export interface Environment {
    https: boolean;
    config: {
        [key: string]: any;
    };
    locations?: FilePaths;
    projectRoot: string;
    production?: boolean;
    development?: boolean;
    polyfill?: boolean;
    mode?: Mode;
}
declare type PathResolver = (input: string) => string;
export interface FilePathsFolder {
    get: PathResolver;
    folder: string;
    indexHtml: string;
    manifest: string;
    serveJson: string;
    favicon: string;
}
export interface FilePaths {
    absolute: PathResolver;
    includeModule: PathResolver;
    template: FilePathsFolder;
    production: FilePathsFolder;
    packageJson: string;
    root: string;
    appMain: string;
    modules: string;
}
export declare type Mode = 'production' | 'development' | 'none';
export interface Arguments {
    allowedHost: any;
    proxy: any;
    [key: string]: any;
}
export {};
