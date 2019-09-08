import { Rule } from 'webpack';
import { FilePaths } from '../types';
declare function createFontLoader({ locations }: {
    locations: FilePaths;
}): Rule;
export default createFontLoader;
