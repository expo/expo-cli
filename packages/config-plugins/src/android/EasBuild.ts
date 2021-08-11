import fs from 'fs-extra';
import path from 'path';

import gradleScript from './EasBuildGradleScript';
import * as Paths from './Paths';

const APPLY_EAS_GRADLE = 'apply from: "./eas-build.gradle"';

function hasApplyLine(content: string, applyLine: string): boolean {
  return (
    content
      .replace(/\r\n/g, '\n')
      .split('\n')
      // Check for both single and double quotes
      .some(line => line === applyLine || line === applyLine.replace(/"/g, "'"))
  );
}

export function getEasBuildGradlePath(projectRoot: string): string {
  return path.join(projectRoot, 'android', 'app', 'eas-build.gradle');
}

export async function configureEasBuildAsync(projectRoot: string): Promise<void> {
  const buildGradlePath = Paths.getAppBuildGradleFilePath(projectRoot);
  const easGradlePath = getEasBuildGradlePath(projectRoot);

  await fs.writeFileSync(easGradlePath, gradleScript);

  const buildGradleContent = await fs.readFileSync(path.join(buildGradlePath), 'utf8');

  const hasEasGradleApply = hasApplyLine(buildGradleContent, APPLY_EAS_GRADLE);

  if (!hasEasGradleApply) {
    await fs.writeFileSync(buildGradlePath, `${buildGradleContent.trim()}\n${APPLY_EAS_GRADLE}\n`);
  }
}

export async function isEasBuildGradleConfiguredAsync(projectRoot: string): Promise<boolean> {
  const buildGradlePath = Paths.getAppBuildGradleFilePath(projectRoot);
  const easGradlePath = getEasBuildGradlePath(projectRoot);

  const hasEasGradleFile = await fs.pathExists(easGradlePath);

  const buildGradleContent = await fs.readFileSync(path.join(buildGradlePath), 'utf8');
  const hasEasGradleApply = hasApplyLine(buildGradleContent, APPLY_EAS_GRADLE);

  return hasEasGradleApply && hasEasGradleFile;
}
