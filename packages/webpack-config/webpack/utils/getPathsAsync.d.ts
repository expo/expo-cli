import { Environment, FilePaths } from '../types';
declare function getPathsAsync({ locations, projectRoot }: Environment): Promise<FilePaths>;
export default getPathsAsync;
