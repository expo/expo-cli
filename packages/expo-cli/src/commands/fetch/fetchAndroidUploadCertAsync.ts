import * as fs from 'fs-extra';
import * as path from 'path';
import { AndroidCredentials } from 'xdl';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import { DownloadKeystore } from '../../credentials/views/AndroidKeystore';
import Log from '../../log';
import { assertSlug, maybeRenameExistingFileAsync, Options } from './utils';

export async function actionAsync(projectRoot: string, options: Options): Promise<void> {
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
