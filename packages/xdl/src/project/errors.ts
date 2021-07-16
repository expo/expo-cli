import XDLError from '../XDLError';

export function assertValidProjectRoot(projectRoot: string) {
  if (!projectRoot) {
    throw new XDLError('NO_PROJECT_ROOT', 'No project root specified');
  }
}
