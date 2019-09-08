import { Mode } from '../types';
/**
 * mode -> production -> development -> process.env.NODE_ENV -> 'development'
 */
declare function getMode({ production, development, mode, }: {
    production?: boolean;
    development?: boolean;
    mode?: Mode;
}): Mode;
export default getMode;
