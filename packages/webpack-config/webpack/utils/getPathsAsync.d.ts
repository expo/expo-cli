import { FilePaths } from '../types';
export default function getPathsAsync({ locations, projectRoot, }?: {
    projectRoot?: string;
    locations?: FilePaths;
}): Promise<FilePaths>;
