import path from 'path';
import fs from 'fs-extra';
import get from 'lodash/get';
import program from 'commander';

import { AndroidCredentials } from '@expo/xdl';
import { DownloadKeystore } from '../../credentials/views/AndroidCredentials';
import { Context } from '../../credentials';
import prompt from '../../prompt';

import log from '../../log';

async function promptIfFileExists(projectDir, filename) {
  while (
    (await fs.pathExists(await path.resolve(projectDir, filename))) &&
    !program.nonInteractive
  ) {
    let question = {
      type: 'input',
      name: 'newName',
      message: `You already have a file in your project directory named "${filename}"\n\n  Press enter to overwrite this file, or provide a different filename:`,
      default: 'overwrite',
    };
    const answer = await prompt(question);
    if (answer.newName === 'overwrite') {
      break;
    } else {
      filename = answer.newName;
    }
  }
  return filename;
}

export async function fetchAndroidKeystoreAsync(projectDir: string): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);

  const keystoreFilename = await promptIfFileExists(projectDir, `${ctx.manifest.slug}.jks`);
  const backupKeystoreOutputPath = path.resolve(projectDir, keystoreFilename);

  const view = new DownloadKeystore(ctx.manifest.slug);
  await view.fetch(ctx);
  await view.save(ctx, backupKeystoreOutputPath, true);
}

export async function fetchAndroidHashesAsync(projectDir: string): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);
  const outputPath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);
  try {
    const view = new DownloadKeystore(ctx.manifest.slug);
    await view.fetch(ctx);
    await view.save(ctx, outputPath);

    // @ts-ignore: keyPassword isn't defined
    await AndroidCredentials.logKeystoreHashes({
      keystorePath: outputPath,
      keystorePassword: get(view, 'credentials.keystorePassword'),
      keyAlias: get(view, 'credentials.keyAlias'),
    });
    log(
      `\nNote: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console.`
    );
  } finally {
    try {
      fs.unlink(outputPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(err);
      }
    }
  }
}

export async function fetchAndroidUploadCertAsync(projectDir: string): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);

  const keystorePath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);

  const uploadKeyFilename = await promptIfFileExists(
    projectDir,
    `${ctx.manifest.slug}_upload_cert.pem`
  );
  const uploadKeyPath = path.resolve(projectDir, uploadKeyFilename);

  try {
    const view = new DownloadKeystore(ctx.manifest.slug);
    await view.fetch(ctx);
    await view.save(ctx, keystorePath);

    log(`Writing upload key to ${uploadKeyPath}`);
    await AndroidCredentials.exportCertBase64(
      {
        keystorePath,
        keystorePassword: get(view, 'credentials.keystorePassword'),
        keyAlias: get(view, 'credentials.keyAlias'),
      },
      uploadKeyPath
    );
  } finally {
    try {
      await fs.unlink(keystorePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(err);
      }
    }
  }
}
