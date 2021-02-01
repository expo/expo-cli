import path from 'path';

import { readXMLAsync } from '../utils/XML';
import { findSchemePaths } from './Paths';

interface SchemeXML {
  Scheme?: {
    BuildAction?: {
      BuildActionEntries?: {
        BuildActionEntry?: {
          BuildableReference?: {
            $?: {
              BlueprintName?: string;
            };
          }[];
        }[];
      }[];
    }[];
  };
}

export async function getApplicationTargetForSchemeAsync(
  projectRoot: string,
  scheme: string
): Promise<string> {
  const allSchemePaths = findSchemePaths(projectRoot);
  const re = new RegExp(`/${scheme}.xcscheme`);
  const schemePath = allSchemePaths.find(i => re.exec(i));
  if (!schemePath) {
    throw new Error(`scheme '${scheme}' does not exist`);
  }

  const schemeXML = ((await readXMLAsync({ path: schemePath })) as unknown) as SchemeXML;
  const targetName =
    schemeXML.Scheme?.BuildAction?.[0]?.BuildActionEntries?.[0]?.BuildActionEntry?.[0]
      ?.BuildableReference?.[0]?.['$']?.BlueprintName;
  if (!targetName) {
    const schemeRelativePath = path.relative(projectRoot, schemePath);
    throw new Error(`${schemeRelativePath} seems to be corrupted`);
  }
  return targetName;
}
