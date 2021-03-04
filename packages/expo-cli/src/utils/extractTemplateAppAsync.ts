import { BareAppConfig, ExpoConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import fs from 'fs-extra';
import merge from 'lodash/merge';
import Minipass from 'minipass';
import pacote, { PackageSpec } from 'pacote';
import path from 'path';
import { Readable } from 'stream';
import tar, { ReadEntry } from 'tar';
import { UserSettings } from 'xdl';

type AppJsonInput = { expo: Partial<ExpoConfig> & { name: string } };
type TemplateConfig = { name: string };

function sanitizedName(name: string) {
  return name
    .replace(/[\W_]+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeXMLCharacters(original: string): string {
  const noAmps = original.replace('&', '&amp;');
  const noLt = noAmps.replace('<', '&lt;');
  const noGt = noLt.replace('>', '&gt;');
  const noApos = noGt.replace('"', '\\"');
  return noApos.replace("'", "\\'");
}

class Transformer extends Minipass {
  data = '';

  constructor(public config: TemplateConfig, private settings: { extension: string }) {
    super();
  }

  write(data: string) {
    this.data += data;
    return true;
  }

  getNormalizedName(): string {
    if (['.xml', '.plist'].includes(this.settings.extension)) {
      return escapeXMLCharacters(this.config.name);
    }
    return this.config.name;
  }

  end() {
    const name = this.getNormalizedName();
    const replaced = this.data
      .replace(/Hello App Display Name/g, name)
      .replace(/HelloWorld/g, sanitizedName(name))
      .replace(/helloworld/g, sanitizedName(name.toLowerCase()));
    super.write(replaced);
    return super.end();
  }
}

// Binary files, don't process these (avoid decoding as utf8)
const binaryExtensions = ['.png', '.jar', '.keystore', '.otf', '.ttf'];

function createFileTransform(config: TemplateConfig) {
  return function transformFile(entry: ReadEntry) {
    const extension = path.extname(entry.path);
    if (!binaryExtensions.includes(extension) && config.name) {
      return new Transformer(config, { extension });
    }
    return undefined;
  };
}

/**
 * Extract a template app to a given file path and clean up any properties left over from npm to
 * prepare it for usage.
 */
export async function extractAndPrepareTemplateAppAsync(
  templateSpec: PackageSpec,
  projectRoot: string,
  config: AppJsonInput | BareAppConfig
) {
  await extractTemplateAppAsync(templateSpec, projectRoot, {
    name: 'name' in config ? config.name : config.expo.name,
  });

  const appFile = new JsonFile(path.join(projectRoot, 'app.json'));
  const appJson = merge(await appFile.readAsync(), config);
  await appFile.writeAsync(appJson);

  const packageFile = new JsonFile(path.join(projectRoot, 'package.json'));
  let packageJson = await packageFile.readAsync();
  // Adding `private` stops npm from complaining about missing `name` and `version` fields.
  // We don't add a `name` field because it also exists in `app.json`.
  packageJson = { ...packageJson, private: true };
  // These are metadata fields related to the template package, let's remove them from the package.json.
  delete packageJson.name;
  delete packageJson.version;
  delete packageJson.description;
  delete packageJson.tags;
  delete packageJson.repository;
  // pacote adds these, but we don't want them in the package.json of the project.
  delete packageJson._resolved;
  delete packageJson._integrity;
  delete packageJson._from;
  await packageFile.writeAsync(packageJson);

  return projectRoot;
}

/**
 * Extract a template app to a given file path.
 */
export async function extractTemplateAppAsync(
  templateSpec: PackageSpec,
  targetPath: string,
  config: { name?: string }
) {
  await pacote.tarball.stream(
    templateSpec,
    tarStream => {
      return extractTemplateAppAsyncImpl(targetPath, config, tarStream);
    },
    {
      cache: path.join(UserSettings.dotExpoHomeDirectory(), 'template-cache'),
    }
  );

  return targetPath;
}

async function extractTemplateAppAsyncImpl(
  targetPath: string,
  config: { name?: string },
  tarStream: Readable
) {
  await fs.mkdirp(targetPath);
  await new Promise((resolve, reject) => {
    const extractStream = tar.x({
      cwd: targetPath,
      strip: 1,
      // TODO(ville): pending https://github.com/DefinitelyTyped/DefinitelyTyped/pull/36598
      // @ts-ignore property missing from the type definition
      transform: createFileTransform(config),
      onentry(entry: ReadEntry) {
        if (config.name) {
          // Rewrite paths for bare workflow
          entry.path = entry.path
            .replace(
              /HelloWorld/g,
              entry.path.includes('android')
                ? sanitizedName(config.name.toLowerCase())
                : sanitizedName(config.name)
            )
            .replace(/helloworld/g, sanitizedName(config.name).toLowerCase());
        }
        if (entry.type && /^file$/i.test(entry.type) && path.basename(entry.path) === 'gitignore') {
          // Rename `gitignore` because npm ignores files named `.gitignore` when publishing.
          // See: https://github.com/npm/npm/issues/1862
          entry.path = entry.path.replace(/gitignore$/, '.gitignore');
        }
      },
    });
    tarStream.on('error', reject);
    extractStream.on('error', reject);
    extractStream.on('close', resolve);
    tarStream.pipe(extractStream);
  });
}
