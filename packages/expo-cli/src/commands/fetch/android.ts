import path from 'path';
import fs from 'fs-extra';
import get from 'lodash/get';

import { AndroidCredentials } from '@expo/xdl';
import invariant from 'invariant';
import { DownloadKeystore } from '../../credentials/views/AndroidCredentials';
import { Context } from '../../credentials';

import log from '../../log';

async function maybeRenameExistingFile(projectDir: string, filename: string) {
  let desiredFilePath = path.resolve(projectDir, filename);

  if (await fs.pathExists(desiredFilePath)) {
    let num = 1;
    while (await fs.pathExists(path.resolve(projectDir, `OLD_${num}_${filename}`))) {
      num++;
    }
    log(
      `\nA file already exists at "${desiredFilePath}"\n  Renaming the existing file to OLD_${num}_${filename}\n`
    );
    await fs.rename(desiredFilePath, path.resolve(projectDir, `OLD_${num}_${filename}`));
  }
}

export async function fetchAndroidKeystoreAsync(projectDir: string): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);

  const keystoreFilename = `${ctx.manifest.slug}.jks`;
  await maybeRenameExistingFile(projectDir, keystoreFilename);
  const backupKeystoreOutputPath = path.resolve(projectDir, keystoreFilename);

  invariant(ctx.manifest.slug, 'app.json slug field must be set');
  const view = new DownloadKeystore(ctx.manifest.slug as string);
  await view.fetch(ctx);
  await view.save(ctx, backupKeystoreOutputPath, true);
}

export async function fetchAndroidHashesAsync(projectDir: string): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir);
  const outputPath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);
  try {
    invariant(ctx.manifest.slug, 'app.json slug field must be set');
    const view = new DownloadKeystore(ctx.manifest.slug as string);
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

  const uploadKeyFilename = `${ctx.manifest.slug}_upload_cert.pem`;
  await maybeRenameExistingFile(projectDir, uploadKeyFilename);
  const uploadKeyPath = path.resolve(projectDir, uploadKeyFilename);

  try {
    invariant(ctx.manifest.slug, 'app.json slug field must be set');
    const view = new DownloadKeystore(ctx.manifest.slug as string);
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
