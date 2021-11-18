import { BareAppConfig, ExpoConfig } from '@expo/config';
import { IOSConfig } from '@expo/config-plugins';
import JsonFile from '@expo/json-file';
import fs from 'fs-extra';
import merge from 'lodash/merge';
import Minipass from 'minipass';
import pacote, { PackageSpec } from 'pacote';
import path from 'path';
import slugify from 'slugify';
import { Readable } from 'stream';
import tar, { ReadEntry } from 'tar';
import { UserSettings } from 'xdl';

type AppJsonInput = { expo: Partial<ExpoConfig> & { name: string } };
type TemplateConfig = { name: string };

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
      .replace(/HelloWorld/g, IOSConfig.XcodeUtils.sanitizedName(name))
      .replace(/helloworld/g, IOSConfig.XcodeUtils.sanitizedName(name.toLowerCase()));
    super.write(replaced);
    return super.end();
  }
}

// Binary files, don't process these (avoid decoding as utf8)
const binaryExtensions = ['.png', '.jar', '.keystore', '.otf', '.ttf'];

export function createFileTransform(config: TemplateConfig) {
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
  const packageJson = await packageFile.readAsync();
  // name and version are required for yarn workspaces (monorepos)
  const inputName = 'name' in config ? config.name : config.expo.name;
  packageJson.name = sanitizeNpmPackageName(inputName);
  // These are metadata fields related to the template package, let's remove them from the package.json.
  // A good place to start
  packageJson.version = '1.0.0';
  packageJson.private = true;

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

export function sanitizeNpmPackageName(name: string): string {
  // https://github.com/npm/validate-npm-package-name/#naming-rules
  return (
    applyKnownNpmPackageNameRules(name) ||
    applyKnownNpmPackageNameRules(slugify(name)) ||
    // If nothing is left use 'app' like we do in Xcode projects.
    'app'
  );
}

function applyKnownNpmPackageNameRules(name: string): string | null {
  // https://github.com/npm/validate-npm-package-name/#naming-rules

  // package name cannot start with '.' or '_'.
  while (/^(\.|_)/.test(name)) {
    name = name.substring(1);
  }

  name = name.toLowerCase().replace(/[^a-zA-Z._\-/@]/g, '');

  return (
    name
      // .replace(/![a-z0-9-._~]+/g, '')
      // Remove special characters
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') || null
  );
}

/**
 * Extract a template app to a given file path.
 */
export async function extractTemplateAppAsync(
  templateSpec: PackageSpec,
  targetPath: string,
  config: TemplateConfig
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

export async function extractTemplateAppFolderAsync(
  tarFilePath: string,
  targetPath: string,
  config: TemplateConfig
) {
  const readStream = fs.createReadStream(tarFilePath);
  await extractTemplateAppAsyncImpl(targetPath, config, readStream);
  return targetPath;
}

export function createEntryResolver(name: string) {
  return (entry: ReadEntry) => {
    if (name) {
      // Rewrite paths for bare workflow
      entry.path = entry.path
        .replace(
          /HelloWorld/g,
          entry.path.includes('android')
            ? IOSConfig.XcodeUtils.sanitizedName(name.toLowerCase())
            : IOSConfig.XcodeUtils.sanitizedName(name)
        )
        .replace(/helloworld/g, IOSConfig.XcodeUtils.sanitizedName(name).toLowerCase());
    }
    if (entry.type && /^file$/i.test(entry.type) && path.basename(entry.path) === 'gitignore') {
      // Rename `gitignore` because npm ignores files named `.gitignore` when publishing.
      // See: https://github.com/npm/npm/issues/1862
      entry.path = entry.path.replace(/gitignore$/, '.gitignore');
    }
  };
}

async function extractTemplateAppAsyncImpl(
  targetPath: string,
  config: TemplateConfig,
  tarStream: Readable
) {
  await fs.mkdirp(targetPath);
  await new Promise((resolve, reject) => {
    const extractStream = tar.x({
      cwd: targetPath,
      strip: 1,
      // TODO(ville): pending https://github.com/DefinitelyTyped/DefinitelyTyped/pull/36598
      transform: createFileTransform(config),
      onentry: createEntryResolver(config.name),
    });
    tarStream.on('error', reject);
    extractStream.on('error', reject);
    extractStream.on('close', resolve);
    tarStream.pipe(extractStream);
  });
}
