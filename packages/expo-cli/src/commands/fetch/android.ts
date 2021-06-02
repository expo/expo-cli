import assert from 'assert';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { AndroidCredentials } from 'xdl';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import { DownloadKeystore } from '../../credentials/views/AndroidKeystore';
import Log from '../../log';

type Options = {
  parent?: {
    nonInteractive: boolean;
  };
};

function assertSlug(slug: any): asserts slug {
  assert(slug, `${chalk.bold(slug)} field must be set in your app.json or app.config.js`);
}

async function maybeRenameExistingFileAsync(projectRoot: string, filename: string) {
  const desiredFilePath = path.resolve(projectRoot, filename);

  if (await fs.pathExists(desiredFilePath)) {
    let num = 1;
    while (await fs.pathExists(path.resolve(projectRoot, `OLD_${num}_${filename}`))) {
      num++;
    }
    Log.log(
      `\nA file already exists at "${desiredFilePath}"\n  Renaming the existing file to OLD_${num}_${filename}\n`
    );
    await fs.rename(desiredFilePath, path.resolve(projectRoot, `OLD_${num}_${filename}`));
  }
}

export async function fetchAndroidKeystoreAsync(
  projectRoot: string,
  options: Options
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectRoot, {
    nonInteractive: options.parent?.nonInteractive,
  });

  const keystoreFilename = `${ctx.manifest.slug}.jks`;
  await maybeRenameExistingFileAsync(projectRoot, keystoreFilename);
  const backupKeystoreOutputPath = path.resolve(projectRoot, keystoreFilename);
  const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

  assertSlug(ctx.manifest.slug);
  await runCredentialsManager(
    ctx,
    new DownloadKeystore(experienceName, {
      outputPath: backupKeystoreOutputPath,
      displayCredentials: true,
    })
  );
}

export async function fetchAndroidHashesAsync(
  projectRoot: string,
  options: Options
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectRoot, {
    nonInteractive: options.parent?.nonInteractive,
  });
  const outputPath = path.resolve(projectRoot, `${ctx.manifest.slug}.tmp.jks`);
  try {
    assertSlug(ctx.manifest.slug);
    const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;
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
      Log.log(
        `\nNote: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console.`
      );
    } else {
      Log.warn('There is no valid Keystore defined for this app');
    }
  } finally {
    await fs.remove(outputPath);
  }
}

export async function fetchAndroidUploadCertAsync(
  projectRoot: string,
  options: Options
): Promise<void> {
  const ctx = new Context();
  await ctx.init(projectRoot, {
    nonInteractive: options.parent?.nonInteractive,
  });

  const keystorePath = path.resolve(projectRoot, `${ctx.manifest.slug}.tmp.jks`);

  const uploadKeyFilename = `${ctx.manifest.slug}_upload_cert.pem`;
  await maybeRenameExistingFileAsync(projectRoot, uploadKeyFilename);
  const uploadKeyPath = path.resolve(projectRoot, uploadKeyFilename);

  try {
    assertSlug(ctx.manifest.slug);
    const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;
    const view = new DownloadKeystore(experienceName, {
      outputPath: keystorePath,
      quiet: true,
    });
    await runCredentialsManager(ctx, view);
    const keystore = await ctx.android.fetchKeystore(experienceName);

    if (keystore) {
      Log.log(`Writing upload key to ${uploadKeyPath}`);
      await AndroidCredentials.exportCertBase64(
        {
          keystorePath,
          keystorePassword: keystore.keystorePassword,
          keyAlias: keystore.keyAlias,
        },
        uploadKeyPath
      );
    } else {
      Log.warn('There is no valid Keystore defined for this app');
    }
  } finally {
    await fs.remove(keystorePath);
  }
}
