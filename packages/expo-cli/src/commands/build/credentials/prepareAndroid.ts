import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import chalk from 'chalk';

import { AndroidCredentials } from '@expo/xdl';
import invariant from 'invariant';

import log from '../../../log';
import { runCredentialsManager } from '../../../credentials/route';
import {
  RemoveKeystore,
  getKeystoreFromParams,
  useKeystore,
} from '../../../credentials/views/AndroidKeystore';
import { SetupAndroidKeystore } from '../../../credentials/views/SetupAndroidKeystore';
import { Context } from '../../../credentials';

type Keystore = AndroidCredentials.Keystore;

interface Options {
  keystorePath?: string;
  keystoreAlias?: string;
  clearCredentials?: boolean;
}

async function prepareBuildCredentials(projectDir: string, options: Options): Promise<Keystore> {
  const ctx = new Context();
  await ctx.init(projectDir);

  const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

  if (options.clearCredentials) {
    await runCredentialsManager(ctx, new RemoveKeystore(experienceName));
  }

  const paramKeystore = await getKeystoreFromParams(options);
  if (paramKeystore) {
    await useKeystore(ctx, experienceName, paramKeystore);
  } else {
    const view = new SetupAndroidKeystore(experienceName);
    await runCredentialsManager(ctx, view);
  }
  const keystore = await ctx.android.fetchKeystore(experienceName);
  if (!keystore) {
    throw new Error("No keystore assigned for this app, this shouldn't happen");
  }
  return keystore;
}

export { prepareBuildCredentials };
