import path from 'path';
import fs from 'fs-extra';
import get from 'lodash/get';

import { AndroidCredentials } from '@expo/xdl';
import { DownloadKeystore } from '../../credentials/views/AndroidCredentials';
import { Context } from '../../credentials';

import log from '../../log';

async function fetchAndroidKeystoreAsync(projectDir) {
  const ctx = new Context();
  await ctx.init(projectDir);

  const backupKeystoreOutputPath = path.resolve(projectDir, `${ctx.manifest.slug}.jks`);

  const view = new DownloadKeystore(ctx.manifest.slug);
  await view.fetch(ctx);
  await view.save(ctx, backupKeystoreOutputPath, true);
}

async function fetchAndroidHashesAsync(projectDir) {
  const ctx = new Context();
  await ctx.init(projectDir);
  const outputPath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);
  try {
    const view = new DownloadKeystore(ctx.manifest.slug);
    await view.fetch(ctx);
    await view.save(ctx, outputPath);

    await AndroidCredentials.logKeystoreHashes({
      keystorePath: outputPath,
      keystorePassword: get(view, 'credentials.keystorePassword'),
      keyAlias: get(view, 'credentials.keyAlias'),
    });
    log(`\nNote: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console.`);
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

async function fetchAndroidUploadCertAsync(projectDir) {
  const ctx = new Context();
  await ctx.init(projectDir);

  const keystorePath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);
  const uploadKeyPath = path.resolve(projectDir, `${ctx.manifest.slug}_upload_cert.pem`);
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

export { fetchAndroidKeystoreAsync, fetchAndroidHashesAsync, fetchAndroidUploadCertAsync };
