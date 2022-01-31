import {
  convertCertificateToCertificatePEM,
  convertKeyPairToPEM,
  generateKeyPair,
  generateSelfSignedCodeSigningCertificate,
} from '@expo/code-signing-certificates';
import assert from 'assert';
import { promises as fs } from 'fs';
import { ensureDir } from 'fs-extra';
import path from 'path';

import Log from '../../log';

type Options = { output?: string; validityDurationYears?: string; commonName?: string };

export async function actionAsync(
  projectRoot: string,
  { output, validityDurationYears: validityDurationYearsString, commonName }: Options
) {
  assert(typeof output === 'string', '--output must be a string');
  assert(
    typeof validityDurationYearsString === 'string',
    '--validity-duration-years must be a number'
  );
  assert(typeof commonName === 'string', '--common-name must be a string');

  const validityDurationYears = parseInt(validityDurationYearsString, 10);

  const outputDir = path.resolve(projectRoot, output);
  await ensureDir(outputDir);

  const isDirectoryEmpty = (await fs.readdir(outputDir)).length === 0;
  assert(isDirectoryEmpty, 'Output directory must be empty');

  const keyPair = generateKeyPair();
  const validityNotBefore = new Date();
  const validityNotAfter = new Date();
  validityNotAfter.setFullYear(validityNotAfter.getFullYear() + validityDurationYears);
  const certificate = generateSelfSignedCodeSigningCertificate({
    keyPair,
    validityNotBefore,
    validityNotAfter,
    commonName,
  });

  const keyPairPEM = convertKeyPairToPEM(keyPair);
  const certificatePEM = convertCertificateToCertificatePEM(certificate);

  await Promise.all([
    fs.writeFile(path.join(outputDir, 'public-key.pem'), keyPairPEM.publicKeyPEM),
    fs.writeFile(path.join(outputDir, 'private-key.pem'), keyPairPEM.privateKeyPEM),
    fs.writeFile(path.join(outputDir, 'certificate.pem'), certificatePEM),
  ]);

  Log.log(`Generated keys and certificates output to ${outputDir}`);
}
