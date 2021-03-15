import path from 'path';

/**
 *  paths returned:
 *    iosProjectDirectory - root directory of an (uncompiled) xcworkspace and obj-c source tree
 *    projectName - xcworkspace project name normalized from context.config
 *    supportingDirectory - location of Info.plist, xib files, etc. during configuration.
 *      for an unbuilt app this is underneath iosProjectDirectory. for a compiled app it's just
 *      a path to the flat xcarchive.
 *    intermediatesDirectory - temporary spot to write whatever files are needed during the
 *      detach/build process but can be discarded afterward.
 */
function getPaths(context: any) {
  let iosProjectDirectory;
  let projectName;
  let supportingDirectory;
  let projectRootDirectory;

  if (context.build.isExpoClientBuild()) {
    projectName = 'Exponent';
  } else if (context.isAnonymous()) {
    projectName = 'ExpoKitApp';
  } else if (context.config && context.config.name) {
    const projectNameLabel = context.config.name;
    projectName = projectNameLabel.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  } else {
    throw new Error('Cannot configure an Expo project with no name.');
  }
  if (context.type === 'user') {
    projectRootDirectory = context.data.projectPath;
    iosProjectDirectory = path.join(context.data.projectPath, 'ios');
    supportingDirectory = path.join(iosProjectDirectory, projectName, 'Supporting');
  } else if (context.type === 'service') {
    projectRootDirectory = path.dirname(context.build.ios.workspaceSourcePath);
    iosProjectDirectory = context.build.ios.workspaceSourcePath;
    if (context.data.archivePath) {
      // compiled archive has a flat NSBundle
      supportingDirectory = context.data.archivePath;
    } else {
      supportingDirectory = path.join(iosProjectDirectory, projectName, 'Supporting');
    }
  } else {
    throw new Error(`Unsupported StandaloneContext type: ${context.type}`);
  }
  // sandbox intermediates directory by workspace so that concurrently operating
  // contexts do not interfere with one another.
  const intermediatesDirectory = path.join(
    iosProjectDirectory,
    context.build.isExpoClientBuild() ? 'ExponentIntermediates' : 'ExpoKitIntermediates'
  );
  return {
    projectRootDirectory,
    intermediatesDirectory,
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  };
}

export { getPaths };
