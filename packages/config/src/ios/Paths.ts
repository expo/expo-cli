import path from 'path';

import { getProjectName } from './utils/Xcodeproj';

export function getPaths(projectRoot: string): { projectName: string; projectPath: string } {
  const projectName = getProjectName(projectRoot);
  const projectPath = path.join(projectRoot, 'ios', projectName);
  return {
    projectName,
    projectPath,
  };
}
