import resolveFrom from 'resolve-from';

const requiredPackages = [
  // use react-native-web/package.json to skip node module cache issues when the user installs
  // the package and attempts to resolve the module in the same process.
  { file: 'react-native-web/package.json', pkg: 'react-native-web' },
  { file: 'react-dom/package.json', pkg: 'react-dom' },
];

export function collectMissingPackages(
  projectRoot: string
): {
  missing: {
    file: string;
    pkg: string;
    version?: string;
  }[];
  resolutions: Record<string, string>;
} {
  const resolutions: Record<string, string> = {};

  const missingPackages = requiredPackages.filter(p => {
    try {
      resolutions[p.pkg] = resolveFrom(projectRoot, p.file);
      return false;
    } catch {
      return true;
    }
  });

  return { missing: missingPackages, resolutions };
}
