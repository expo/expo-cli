import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  preset: '../../jest/unit-test-config',
  rootDir: resolve(__dirname),
  displayName: 'expo-env-info',
  extensionsToTreatAsEsm: ['.ts'],
};
