import {
  project as PBXProject,
  UUID,
  PBXXCConfigurationList,
  PBXXCBuildConfiguration,
  PBXFile,
} from 'xcode';

/**
 * @param filePath
 * @param param1.target PBXNativeTarget reference
 * @param param1.group PBXGroup reference
 */
export function addStoryboardFileToProject(
  pbxProject: PBXProject,
  filePath: string,
  { target, group }: { target: UUID; group: UUID }
) {
  const file = pbxProject.addFile(filePath, undefined, {
    lastKnownFileType: 'file.storyboard',
    defaultEncoding: 4,
    target,
  });
  if (!file) {
    throw new Error('File already exists in the project');
  }
  delete (pbxProject.pbxFileReferenceSection()[file.fileRef] as PBXFile).explicitFileType;
  delete (pbxProject.pbxFileReferenceSection()[file.fileRef] as PBXFile).includeInIndex;

  file.uuid = pbxProject.generateUuid();
  file.target = target;

  pbxProject.addToPbxBuildFileSection(file);
  pbxProject.addToPbxResourcesBuildPhase(file);
  pbxProject.addToPbxGroup(file, group);
}

/**
 * Queries pbxproj file for SWIFT_OBJC_BRIDGING_HEADER value for given target
 * @param param.target PBXNativeTarget reference
 */
export function getSwiftObjCBridgingHeaderFile(
  pbxProject: PBXProject,
  { target }: { target: UUID }
): string | undefined {
  // console.log(pbxProject.pbxXCBuildConfigurationSection()); // 13B07F951A680F5B00A75B9A
  // console.log(pbxProject.pbxXCConfigurationList()); // 13B07F931A680F5B00A75B9A
  const nativeTarget = pbxProject.getTarget('com.apple.product-type.application');
  if (!nativeTarget || nativeTarget.uuid !== target) {
    return;
  }
  const buildConfigurationList = pbxProject.pbxXCConfigurationList()[
    nativeTarget.target.buildConfigurationList
  ] as PBXXCConfigurationList;
  const buildConfigurationUUID = buildConfigurationList.buildConfigurations.find(
    ({ comment }) => comment === 'Release'
  )?.value;
  if (!buildConfigurationUUID) {
    return;
  }
  const buildConfiguration = pbxProject.pbxXCBuildConfigurationSection()[
    buildConfigurationUUID
  ] as PBXXCBuildConfiguration;
  const swiftObjCBridgingHeaderFilename = buildConfiguration.buildSettings[
    'SWIFT_OBJC_BRIDGING_HEADER'
  ]?.replace(/"/g, '');
  if (!swiftObjCBridgingHeaderFilename) {
    return;
  }
  const swiftObjCBridgingHeaderFileUUID = Object.entries(pbxProject.pbxFileReferenceSection())
    .find(([_, value]) => {
      if (typeof value !== 'string') return false;
      return typeof value === 'string' && RegExp(swiftObjCBridgingHeaderFilename).test(value);
    })?.[0]
    .replace('_comment', '');
  if (!swiftObjCBridgingHeaderFileUUID) {
    return;
  }
  const swiftObjCBridgingHeaderPBXFile = pbxProject.pbxFileReferenceSection()[
    swiftObjCBridgingHeaderFileUUID
  ] as PBXFile;

  const swiftObjCBridgingHeaderFilePath = swiftObjCBridgingHeaderPBXFile.path?.replace(/"/g, '');
  return swiftObjCBridgingHeaderFilePath;
}
