import fetch from 'node-fetch';

async function getNpmPackageDistTagsAsync(name: string): Promise<Record<string, string>> {
  const manifest = await fetch(`https://registry.npmjs.org/-/package/${name}/dist-tags`);
  return await manifest.json();
}

export async function assertNpmPackageHasDistTagAsync(name: string, tag: string): Promise<string> {
  const json = await getNpmPackageDistTagsAsync(name);
  if (tag in json) {
    return json[tag];
  }

  throw new Error(
    `NPM distribution tag "${tag}" not found on package "${name}". Available tags: ${Object.keys(
      json
    )
      .sort()
      .join(', ')}`
  );
}
