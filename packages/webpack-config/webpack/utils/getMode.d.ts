import { Mode, Environment } from '../types';
/**
 * mode -> production -> development -> process.env.NODE_ENV -> 'development'
 */
declare function getMode({ production, development, mode }: Environment): Mode;
export default getMode;
