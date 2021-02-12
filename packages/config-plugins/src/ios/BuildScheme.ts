import path from 'path';

import { readXMLAsync } from '../utils/XML';
import { findSchemeNames, findSchemePath } from './Paths';

export enum BuildConfiguration {
  RELEASE = 'Release',
  DEBUG = 'Debug',
}

interface SchemeXML {
  Scheme?: {
    BuildAction?: {
      BuildActionEntries?: {
        BuildActionEntry?: BuildActionEntryType[];
      }[];
    }[];
    ArchiveAction?: {
      $?: {
        buildConfiguration: BuildConfiguration;
      };
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

export function getBuildSchemesFromXcodeproj(projectRoot: string): string[] {
  return findSchemeNames(projectRoot);
}

export async function getBuildConfigurationForSchemeAsync(
  projectRoot: string,
  scheme: string
): Promise<BuildConfiguration> {
  const schemePath = findSchemePath(projectRoot, scheme);
  const schemeXML = ((await readXMLAsync({ path: schemePath })) as unknown) as SchemeXML;
  return schemeXML.Scheme?.ArchiveAction?.[0].$?.buildConfiguration ?? BuildConfiguration.RELEASE;
}

export async function getApplicationTargetForSchemeAsync(
  projectRoot: string,
  scheme: string
): Promise<string> {
  const schemePath = findSchemePath(projectRoot, scheme);
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
