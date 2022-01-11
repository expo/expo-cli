import { boolish } from 'getenv';
import os from 'os';

export function home(): string {
  return os.homedir();
}

export function isDebug(): boolean {
  return boolish('EXPO_DEBUG', false);
}

export function isStaging(): boolean {
  return boolish('EXPO_STAGING', false);
}

export function isLocal(): boolean {
  return boolish('EXPO_LOCAL', false);
}

export function isLocalSchemaEnabled(): boolean {
  return boolish('LOCAL_XDL_SCHEMA', false);
}
