import path from 'path';

import { readXMLAsync } from '../utils/XML';
import { findSchemeNames, findSchemePaths } from './Paths';

interface SchemeXML {
  Scheme?: {
    BuildAction?: {
      BuildActionEntries?: {
        BuildActionEntry?: BuildActionEntryType[];
      }[];
    }[];
  };
}

interface BuildActionEntryType {
  BuildableReference?: {
    $?: {
      BlueprintName?: string;
      BuildableName?: string;
    };
  }[];
}

export function getSchemesFromXcodeproj(projectRoot: string): string[] {
  return findSchemeNames(projectRoot);
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
  const buildActionEntry =
    schemeXML.Scheme?.BuildAction?.[0]?.BuildActionEntries?.[0]?.BuildActionEntry;
  const targetName =
    buildActionEntry?.length === 1
      ? getBlueprintName(buildActionEntry[0])
      : getBlueprintName(
          buildActionEntry?.find(entry => {
            return entry.BuildableReference?.[0]?.['$']?.BuildableName?.endsWith('.app');
          })
        );
  if (!targetName) {
    const schemeRelativePath = path.relative(projectRoot, schemePath);
    throw new Error(`${schemeRelativePath} seems to be corrupted`);
  }
  return targetName;
}

function getBlueprintName(entry?: BuildActionEntryType): string | undefined {
  return entry?.BuildableReference?.[0]?.['$']?.BlueprintName;
}
