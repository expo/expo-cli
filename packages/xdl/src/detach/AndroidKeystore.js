import { createSpawner } from './ExponentTools';

const BUILD_PHASE = 'generating keystore';

export async function createKeystore({
  keystorePassword,
  keyPassword,
  keystoreFilename,
  keystoreAlias,
  androidPackage,
}) {
  const spawn = createSpawner(BUILD_PHASE);
  return spawn(
    'keytool',
    '-genkey',
    '-v',
    '-storepass',
    keystorePassword,
    '-keypass',
    keyPassword,
    '-keystore',
    keystoreFilename,
    '-alias',
    keystoreAlias,
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-dname',
    `CN=${androidPackage},OU=,O=,L=,S=,C=US`,
    {
      stdoutOnly: true,
    }
  );
}
