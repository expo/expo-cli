/* eslint-disable import/export */
import * as AndroidConfig from './android';
import * as IOSConfig from './ios';
import * as WarningAggregator from './utils/warnings';

export * from './Plugin.types';
export { IOSConfig, AndroidConfig };

export { WarningAggregator };
