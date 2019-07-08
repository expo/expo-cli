import { FilePaths } from '../utils/getPathsAsync';
declare function createFontLoader({ locations }: {
    locations: FilePaths;
}): {
    test: RegExp;
    use: {
        loader: string;
        options: {
            limit: number;
            name: string;
        };
    }[];
    include: any[];
};
export default createFontLoader;
