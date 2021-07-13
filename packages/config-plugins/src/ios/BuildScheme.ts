import { readXMLAsync } from '../utils/XML';
import { findSchemeNames, findSchemePaths } from './Paths';
import { findSignableTargets } from './Target';
import { getPbxproj, unquote } from './utils/Xcodeproj';

interface SchemeXML {
  Scheme?: {
    BuildAction?: {
      BuildActionEntries?: {
        BuildActionEntry?: BuildActionEntryType[];
      }[];
    }[];
    ArchiveAction?: {
      $?: {
        buildConfiguration?: string;
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

export function getSchemesFromXcodeproj(projectRoot: string): string[] {
  return findSchemeNames(projectRoot);
}

export function getRunnableSchemesFromXcodeproj(
  projectRoot: string
): { name: string; type: string }[] {
  const project = getPbxproj(projectRoot);

  return findSignableTargets(project).map(([, target]) => ({
    name: unquote(target.name),
    type: unquote(target.productType),
  }));
}

async function readSchemeAsync(
  projectRoot: string,
  scheme: string
): Promise<SchemeXML | undefined> {
  const allSchemePaths = findSchemePaths(projectRoot);
  const re = new RegExp(`/${scheme}.xcscheme`, 'i');
  const schemePath = allSchemePaths.find(i => re.exec(i));
  if (schemePath) {
    return ((await readXMLAsync({ path: schemePath })) as unknown) as SchemeXML | undefined;
  } else {
    throw new Error(`scheme '${scheme}' does not exist, make sure it's marked as shared`);
  }
}

export async function getApplicationTargetNameForSchemeAsync(
  projectRoot: string,
  scheme: string
): Promise<string> {
  const schemeXML = await readSchemeAsync(projectRoot, scheme);
  const buildActionEntry =
    schemeXML?.Scheme?.BuildAction?.[0]?.BuildActionEntries?.[0]?.BuildActionEntry;
  const targetName =
    buildActionEntry?.length === 1
      ? getBlueprintName(buildActionEntry[0])
      : getBlueprintName(
          buildActionEntry?.find(entry => {
            return entry.BuildableReference?.[0]?.['$']?.BuildableName?.endsWith('.app');
          })
        );
  if (!targetName) {
    throw new Error(`${scheme}.xcscheme seems to be corrupted`);
  }
  return targetName;
}

export async function getArchiveBuildConfigurationForSchemeAsync(
  projectRoot: string,
  scheme: string
): Promise<string> {
  const schemeXML = await readSchemeAsync(projectRoot, scheme);
  const buildConfiguration = schemeXML?.Scheme?.ArchiveAction?.[0]?.['$']?.buildConfiguration;
  if (!buildConfiguration) {
    throw new Error(`${scheme}.xcscheme seems to be corrupted`);
  }
  return buildConfiguration;
}

function getBlueprintName(entry?: BuildActionEntryType): string | undefined {
  return entry?.BuildableReference?.[0]?.['$']?.BlueprintName;
}
