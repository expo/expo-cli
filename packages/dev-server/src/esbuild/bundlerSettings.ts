import getenv from 'getenv';

export const isDebug = getenv.boolish('EXPO_DEBUG', false);

export function getBundleEnvironment({ isDev }: { isDev: boolean }) {
  return {
    'process.env.JEST_WORKER_ID': String(false),
    'process.env.NODE_DEV': isDev ? '"development"' : '"production"',
    __DEV__: String(isDev),
    global: 'window',
  };
}

export function getMainFields(platform: string) {
  const fields = ['browser', 'module', 'main'];
  if (platform !== 'web') {
    fields.unshift('react-native');
  }
  return fields;
}

export function getAssetExtensions() {
  return [
    'bmp',
    'gif',
    'jpg',
    'jpeg',
    'png',
    'psd',
    'svg',
    'webp',
    'm4v',
    'mov',
    'mp4',
    'mpeg',
    'mpg',
    'webm',
    'aac',
    'aiff',
    'caf',
    'm4a',
    'mp3',
    'wav',
    'html',
    'pdf',
    'yaml',
    'yml',
    'otf',
    'ttf',
    'zip',
    'db',
  ];
}
