import Log from '../../../../log';
import prompt from '../../../../prompts';
import { ArchiveType } from '../android/AndroidSubmissionConfig';

enum ArchiveTypeSourceType {
  infer,
  parameter,
  prompt,
}

interface ArchiveTypeSourceBase {
  sourceType: ArchiveTypeSourceType;
}

interface ArchiveTypeInferSource extends ArchiveTypeSourceBase {
  sourceType: ArchiveTypeSourceType.infer;
}

interface ArchiveTypeParameterSource extends ArchiveTypeSourceBase {
  sourceType: ArchiveTypeSourceType.parameter;
  archiveType: ArchiveType;
}

interface ArchiveTypePromptSource extends ArchiveTypeSourceBase {
  sourceType: ArchiveTypeSourceType.prompt;
}

export type ArchiveTypeSource =
  | ArchiveTypeInferSource
  | ArchiveTypeParameterSource
  | ArchiveTypePromptSource;

async function getArchiveTypeAsync(
  source: ArchiveTypeSource,
  location: string
): Promise<ArchiveType> {
  switch (source.sourceType) {
    case ArchiveTypeSourceType.infer:
      return handleInferSourceAsync(source, location);
    case ArchiveTypeSourceType.parameter:
      return handleParameterSourceAsync(source, location);
    case ArchiveTypeSourceType.prompt:
      return handlePromptSourceAsync(source, location);
  }
}

async function handleInferSourceAsync(
  _source: ArchiveTypeInferSource,
  location: string
): Promise<ArchiveType> {
  const inferredArchiveType = inferArchiveTypeFromLocation(location);
  if (inferredArchiveType) {
    return inferredArchiveType;
  } else {
    Log.warn("We couldn't autodetect the archive type");
    return getArchiveTypeAsync({ sourceType: ArchiveTypeSourceType.prompt }, location);
  }
}

async function handleParameterSourceAsync(
  source: ArchiveTypeParameterSource,
  location: string
): Promise<ArchiveType> {
  const inferredArchiveType = inferArchiveTypeFromLocation(location);
  if (inferredArchiveType) {
    if (source.archiveType === inferredArchiveType) {
      return source.archiveType;
    } else {
      Log.warn(
        `The archive seems to be .${inferredArchiveType} and you passed: --type ${source.archiveType}`
      );
      return getArchiveTypeAsync({ sourceType: ArchiveTypeSourceType.prompt }, location);
    }
  } else {
    return source.archiveType;
  }
}

async function handlePromptSourceAsync(
  _source: ArchiveTypePromptSource,
  location: string
): Promise<ArchiveType> {
  const inferredArchiveType = inferArchiveTypeFromLocation(location);
  const { archiveType: archiveTypeRaw } = await prompt({
    name: 'archiveType',
    type: 'select',
    message: "What's the archive type?",
    choices: [
      { title: 'APK', value: ArchiveType.apk },
      { title: 'AAB', value: ArchiveType.aab },
    ],
    ...(inferredArchiveType && { default: inferredArchiveType }),
  });
  return archiveTypeRaw as ArchiveType;
}

type ArchiveInferredType = ArchiveType | null;

function inferArchiveTypeFromLocation(location: string): ArchiveInferredType {
  if (location.endsWith('.apk')) {
    return ArchiveType.apk;
  } else if (location.endsWith('.aab')) {
    return ArchiveType.aab;
  } else {
    return null;
  }
}

export { ArchiveTypeSourceType, getArchiveTypeAsync };
