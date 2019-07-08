import { Environment } from '../types';
declare function getConfigAsync(env: Environment): Promise<{
    [key: string]: any;
}>;
export default getConfigAsync;
