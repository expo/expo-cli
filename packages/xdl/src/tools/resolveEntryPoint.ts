import { ProjectConfig } from '@expo/config';
import { getEntryPoint } from '@expo/config/paths';
import path from 'path';

const supportedPlatforms = ['ios', 'android', 'web'];

export function resolveEntryPoint(
  projectRoot: string,
  platform?: string,
  projectConfig?: ProjectConfig
): string {
  if (platform && !supportedPlatforms.includes(platform)) {
    throw new Error(
      `Failed to resolve the project's entry file: The platform "${platform}" is not supported.`
    );
  }
  // TODO: Bacon: support platform extension resolution like .ios, .native
  // const platforms = [platform, 'native'].filter(Boolean) as string[];
  const platforms: string[] = [];

  const entry = getEntryPoint(projectRoot, ['./index'], platforms, projectConfig);
  if (!entry)
    throw new Error(
      `The project entry file could not be resolved. Please either define it in the \`package.json\` (main), \`app.json\` (expo.entryPoint), create an \`index.js\`, or install the \`expo\` package.`
    );

  return path.relative(projectRoot, entry);
}
