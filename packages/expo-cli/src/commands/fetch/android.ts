import { AndroidCredentials } from '@expo/xdl';
import fs from 'fs-extra';
import invariant from 'invariant';
import path from 'path';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import { DownloadKeystore } from '../../credentials/views/AndroidKeystore';
import log from '../../log';

type Options = {
  parent?: {
    nonInteractive: boolean;
  };
};

async function maybeRenameExistingFile(projectDir: string, filename: string) {
  const desiredFilePath = path.resolve(projectDir, filename);

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

export async function fetchAndroidKeystoreAsync(
  projectDir: string,
  options: Options
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir, {
    nonInteractive: options.parent?.nonInteractive,
  });

  const keystoreFilename = `${ctx.manifest.slug}.jks`;
  await maybeRenameExistingFile(projectDir, keystoreFilename);
  const backupKeystoreOutputPath = path.resolve(projectDir, keystoreFilename);
  const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

  invariant(ctx.manifest.slug, 'app.json slug field must be set');
  await runCredentialsManager(
    ctx,
    new DownloadKeystore(experienceName, {
      outputPath: backupKeystoreOutputPath,
      displayCredentials: true,
    })
  );
}

export async function fetchAndroidHashesAsync(projectDir: string, options: Options): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir, {
    nonInteractive: options.parent?.nonInteractive,
  });
  const outputPath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);
  try {
    invariant(ctx.manifest.slug, 'app.json slug field must be set');
    const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
    const view = new DownloadKeystore(experienceName, {
      outputPath,
      quiet: true,
    });
    await runCredentialsManager(ctx, view);
    const keystore = await ctx.android.fetchKeystore(experienceName);

    if (keystore) {
      await AndroidCredentials.logKeystoreHashes({
        keystorePath: outputPath,
        keystorePassword: keystore.keystorePassword,
        keyAlias: keystore.keyAlias,
        keyPassword: keystore.keyPassword,
      });
      log(
        `\nNote: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console.`
      );
    } else {
      log.warn('There is no valid Keystore defined for this app');
    }
  } finally {
    await fs.remove(outputPath);
  }
}

export async function fetchAndroidUploadCertAsync(
  projectDir: string,
  options: Options
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectDir, {
    nonInteractive: options.parent?.nonInteractive,
  });

  const keystorePath = path.resolve(projectDir, `${ctx.manifest.slug}.tmp.jks`);

  const uploadKeyFilename = `${ctx.manifest.slug}_upload_cert.pem`;
  await maybeRenameExistingFile(projectDir, uploadKeyFilename);
  const uploadKeyPath = path.resolve(projectDir, uploadKeyFilename);

  try {
    invariant(ctx.manifest.slug, 'app.json slug field must be set');
    const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
    const view = new DownloadKeystore(experienceName, {
      outputPath: keystorePath,
      quiet: true,
    });
    await runCredentialsManager(ctx, view);
    const keystore = await ctx.android.fetchKeystore(experienceName);

    if (keystore) {
      log(`Writing upload key to ${uploadKeyPath}`);
      await AndroidCredentials.exportCertBase64(
        {
          keystorePath,
          keystorePassword: keystore.keystorePassword,
          keyAlias: keystore.keyAlias,
        },
        uploadKeyPath
      );
    } else {
      log.warn('There is no valid Keystore defined for this app');
    }
  } finally {
    await fs.remove(keystorePath);
  }
}
