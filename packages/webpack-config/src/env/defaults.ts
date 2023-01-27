import { boolish } from 'getenv';

export const EXPO_DEBUG = boolish('EXPO_DEBUG', false);
export const host = process.env.HOST || '0.0.0.0';
export const sockHost = process.env.WDS_SOCKET_HOST;
// TODO: /ws throws on native because it expects wds to provide a version number like `2`, to get around this we use a different path.
export const sockPath = process.env.WDS_SOCKET_PATH || '/_expo/ws'; // default: '/ws'
export const sockPort = process.env.WDS_SOCKET_PORT;

// Source maps are resource heavy and can cause out of memory issue for large source files.
export const shouldUseSourceMap = boolish('GENERATE_SOURCEMAP', true);
export const isCI = boolish('CI', false);
