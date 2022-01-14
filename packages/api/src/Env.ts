import { boolish, int, string } from 'getenv';

class Env {
  get XDL_SCHEME() {
    return string('XDL_SCHEME', 'https');
  }

  get EXPO_LOCAL() {
    return boolish('EXPO_LOCAL', false);
  }
  /** Should use the beta release of Expo */
  get EXPO_BETA() {
    return boolish('EXPO_BETA', false);
  }
  /** Should use debug logging */
  get EXPO_DEBUG() {
    return boolish('EXPO_DEBUG', false);
  }

  get EXPO_STAGING() {
    return boolish('EXPO_STAGING', false);
  }

  get LOCAL_XDL_SCHEMA() {
    return boolish('LOCAL_XDL_SCHEMA', false);
  }

  get SKIP_CACHE() {
    return boolish('SKIP_CACHE', false);
  }

  get XDL_PORT() {
    return int('XDL_PORT', 0);
  }

  /** Defaults to `exp.host` */
  get XDL_HOST() {
    return string('XDL_HOST', 'exp.host');
  }

  get EXPONENT_UNIVERSE_DIR() {
    return string('EXPONENT_UNIVERSE_DIR', '');
  }

  get XDG_CACHE_HOME() {
    return string('XDG_CACHE_HOME', '');
  }

  /** Dangerously overwrite the .expo home directory. Should only be used for testing. */
  get __UNSAFE_EXPO_HOME_DIRECTORY() {
    return string('__UNSAFE_EXPO_HOME_DIRECTORY', '');
  }

  /** User token */
  get EXPO_TOKEN(): string | null {
    return process.env.EXPO_TOKEN ?? null;
  }
}

export default new Env();
