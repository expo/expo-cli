import fs from 'fs-extra';
import path from 'path';

import gradleScript from './EasBuildGradleScript';

const APPLY_EAS_GRADLE = 'apply from: "./eas-build.gradle"';

function hasApplyLine(content: string, applyLine: string) {
  return (
    content
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === applyLine || line === applyLine.replace(/"/g, "'"))
  );
}

export function getEasBuildGradlePath(projectDir: string): string {
  return path.join(projectDir, 'android', 'app', 'eas-build.gradle');
}

export async function configureEasBuildAsync(projectRoot: string) {
  const buildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  const easGradlePath = getEasBuildGradlePath(projectRoot);

  await fs.writeFile(easGradlePath, gradleScript);

  const buildGradleContent = await fs.readFile(path.join(buildGradlePath), 'utf-8');

  const hasEasGradleApply = hasApplyLine(buildGradleContent, APPLY_EAS_GRADLE);

  if (!hasEasGradleApply) {
    await fs.writeFile(buildGradlePath, `${buildGradleContent.trim()}\n${APPLY_EAS_GRADLE}\n`);
  }
}

export async function isEasBuildGradleConfiguredAsync(projectRoot: string): Promise<boolean> {
  const buildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  const easGradlePath = getEasBuildGradlePath(projectRoot);

  const hasEasGradleFile = await fs.pathExists(easGradlePath);

  const buildGradleContent = await fs.readFile(path.join(buildGradlePath), 'utf-8');
  const hasEasGradleApply = hasApplyLine(buildGradleContent, APPLY_EAS_GRADLE);

  return hasEasGradleApply && hasEasGradleFile;
}
