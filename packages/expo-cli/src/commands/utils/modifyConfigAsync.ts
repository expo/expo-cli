import { ExpoConfig, modifyConfigAsync } from '@expo/config';

import { SilentError } from '../../CommandError';
import Log from '../../log';

export async function attemptModification(
  projectRoot: string,
  edits: Partial<ExpoConfig>,
  exactEdits: Partial<ExpoConfig>
): Promise<void> {
  const modification = await modifyConfigAsync(projectRoot, edits, {
    skipSDKVersionRequirement: true,
  });
  if (modification.type === 'success') {
    Log.addNewLineIfNone();
  } else {
    warnAboutConfigAndThrow(modification.type, modification.message!, exactEdits);
  }
}

function logNoConfig() {
  Log.log(
    Log.chalk.yellow(
      `No Expo config was found. Please create an Expo config (${Log.chalk.bold`app.json`} or ${Log
        .chalk.bold`app.config.js`}) in your project root.`
    )
  );
}

export async function attemptAddingPluginsAsync(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'plugins'>,
  plugins: string[]
): Promise<void> {
  if (!plugins.length) return;

  const edits = {
    plugins: (exp.plugins || []).concat(plugins),
  };
  const modification = await modifyConfigAsync(projectRoot, edits, {
    skipSDKVersionRequirement: true,
  });
  if (modification.type === 'success') {
    Log.log(`\u203A Added config plugins: ${plugins.join(', ')}`);
  } else {
    const exactEdits = {
      plugins,
    };
    warnAboutConfigAndThrow(modification.type, modification.message!, exactEdits);
  }
}

export function warnAboutConfigAndThrow(type: string, message: string, edits: Partial<ExpoConfig>) {
  Log.addNewLineIfNone();
  if (type === 'warn') {
    // The project is using a dynamic config, give the user a helpful log and bail out.
    Log.log(Log.chalk.yellow(message));
  } else {
    logNoConfig();
  }

  notifyAboutManualConfigEdits(edits);
  throw new SilentError();
}

function notifyAboutManualConfigEdits(edits: Partial<ExpoConfig>) {
  Log.log(Log.chalk.cyan(`Please add the following to your Expo config`));
  Log.newLine();
  Log.log(JSON.stringify(edits, null, 2));
  Log.newLine();
}
