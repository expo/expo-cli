/**
 *  @flow
 */
import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';
import { DOMParser, XMLSerializer } from 'xmldom';

import {
  manifestUsesSplashApi,
  parseSdkMajorVersion,
  saveImageToPathAsync,
  spawnAsyncThrowError,
  transformFileContentsAsync,
} from './ExponentTools';
import * as IosWorkspace from './IosWorkspace';
import StandaloneContext from './StandaloneContext';
import _logger from './Logger';

const logger = _logger.withFields({ buildPhase: 'configuring NSBundle' });

const ASPECT_FILL = 'scaleAspectFill';
const ASPECT_FIT = 'scaleAspectFit';

const backgroundImageViewID = 'Bsh-cT-K4l';
const backgroundViewID = 'OfY-5Y-tS4';

function _backgroundColorFromHexString(hexColor) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  if (!result || result.length < 4) {
    // Default to white if we can't parse the color. We should have 3 matches.
    logger.warn('Unable to parse color: ', hexColor, ' result:', result);
    return { r: 1, g: 1, b: 1 };
  }

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  return { r, g, b };
}

function _setBackgroundColor(manifest, dom) {
  let backgroundColorString;
  if (manifest.ios && manifest.ios.splash && manifest.ios.splash.backgroundColor) {
    backgroundColorString = manifest.ios.splash.backgroundColor;
  } else if (manifest.splash && manifest.splash.backgroundColor) {
    backgroundColorString = manifest.splash.backgroundColor;
  }

  // Default to white
  if (!backgroundColorString) {
    backgroundColorString = '#FFFFFF';
  }

  const { r, g, b } = _backgroundColorFromHexString(backgroundColorString);
  const backgroundViewNode = dom.getElementById(backgroundViewID);
  const backgroundViewColorNodes = backgroundViewNode.getElementsByTagName('color');
  let backgroundColorNode;
  for (let i = 0; i < backgroundViewColorNodes.length; i++) {
    const node = backgroundViewColorNodes[i];
    if (node.parentNode.getAttribute('id') !== backgroundViewID) {
      continue;
    }

    if (node.getAttribute('key') === 'backgroundColor') {
      backgroundColorNode = node;
      break;
    }
  }

  if (backgroundColorNode) {
    backgroundColorNode.setAttribute('red', r);
    backgroundColorNode.setAttribute('green', g);
    backgroundColorNode.setAttribute('blue', b);
  }
}

async function _saveImageAssetsAsync(context: StandaloneContext) {
  let tabletImagePathOrUrl, phoneImagePathOrUrl;

  if (context.type === 'user') {
    // copy images from local project
    const exp = context.data.exp;
    if (exp.ios && exp.ios.splash && exp.ios.splash.image) {
      phoneImagePathOrUrl = exp.ios.splash.image;

      if (exp.ios.splash.tabletImage) {
        tabletImagePathOrUrl = exp.ios.splash.tabletImage;
      }
    } else if (exp.splash && exp.splash.image) {
      phoneImagePathOrUrl = exp.splash.image;
    }
  } else {
    // use uploaded assets from published project
    const manifest = context.data.manifest;
    if (manifest.ios && manifest.ios.splash && manifest.ios.splash.imageUrl) {
      phoneImagePathOrUrl = manifest.ios.splash.imageUrl;

      if (manifest.ios.splash.tabletImageUrl) {
        tabletImagePathOrUrl = manifest.ios.splash.tabletImageUrl;
      }
    } else if (manifest.splash && manifest.splash.imageUrl) {
      phoneImagePathOrUrl = manifest.splash.imageUrl;
    }
  }

  if (!phoneImagePathOrUrl) {
    return;
  }

  const outputs = [];
  if (!tabletImagePathOrUrl) {
    outputs.push({
      pathOrUrl: phoneImagePathOrUrl,
      filename: 'launch_background_image.png',
    });
  } else {
    outputs.push({
      pathOrUrl: phoneImagePathOrUrl,
      filename: 'launch_background_image~iphone.png',
    });
    outputs.push({
      pathOrUrl: tabletImagePathOrUrl,
      filename: 'launch_background_image.png',
    });
  }

  const { supportingDirectory } = IosWorkspace.getPaths(context);
  const projectRoot = context.type === 'user' ? context.data.projectPath : supportingDirectory;
  outputs.forEach(async output => {
    const { pathOrUrl, filename } = output;
    const destinationPath = path.join(supportingDirectory, filename);
    await saveImageToPathAsync(projectRoot, pathOrUrl, destinationPath);
  });
}

function _setBackgroundImageResizeMode(manifest, dom) {
  let backgroundViewMode = (() => {
    let mode;
    if (!manifest) {
      return ASPECT_FIT;
    }

    if (manifest.ios && manifest.ios.splash && manifest.ios.splash.resizeMode) {
      mode = manifest.ios.splash.resizeMode;
    } else if (manifest.splash && manifest.splash.resizeMode) {
      mode = manifest.splash.resizeMode;
    }

    return mode === 'cover' ? ASPECT_FILL : ASPECT_FIT;
  })();

  const backgroundImageViewNode = dom.getElementById(backgroundImageViewID);
  if (backgroundImageViewNode) {
    backgroundImageViewNode.setAttribute('contentMode', backgroundViewMode);
  }
}

async function _copyIntermediateLaunchScreenAsync(
  context: StandaloneContext,
  launchScreenPath: string
) {
  let splashTemplateFilename;
  if (context.type === 'user') {
    const { supportingDirectory } = IosWorkspace.getPaths(context);
    splashTemplateFilename = path.join(supportingDirectory, 'LaunchScreen.xib');
  } else {
    // TODO: after shell apps use detached workspaces,
    // we can just do this with the workspace's copy instead of referencing expoSourcePath.
    const expoTemplatePath = path.join(
      context.data.expoSourcePath,
      '..',
      'exponent-view-template',
      'ios'
    );
    splashTemplateFilename = path.join(
      expoTemplatePath,
      'exponent-view-template',
      'Supporting',
      'LaunchScreen.xib'
    );
  }
  await spawnAsyncThrowError('/bin/cp', [splashTemplateFilename, launchScreenPath], {
    stdio: 'inherit',
  });

}

function _maybeAbortForBackwardsCompatibility(context: StandaloneContext) {
  // before SDK 23, the ExpoKit template project didn't have the code or supporting files
  // to have a configurable splash screen. so don't try to move nonexistent files around
  // or edit them.
  let sdkVersion;
  try {
    sdkVersion = parseSdkMajorVersion(context.config.sdkVersion);
  } catch (_) {
    sdkVersion = 0; // :thinking_face:
  }
  if (sdkVersion < 23 && context.type === 'user' && !process.env.EXPO_VIEW_DIR) {
    return true;
  }
  return false;
}

async function configureLaunchAssetsAsync(
  context: StandaloneContext,
  intermediatesDirectory: string
) {
  if (_maybeAbortForBackwardsCompatibility(context)) {
    return;
  }
  logger.info('Configuring iOS Launch Screen...');

  mkdirp.sync(intermediatesDirectory);
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  const config = context.config;

  const splashIntermediateFilename = path.join(intermediatesDirectory, 'LaunchScreen.xib');
  await _copyIntermediateLaunchScreenAsync(context, splashIntermediateFilename);

  if (manifestUsesSplashApi(config, 'ios')) {
    await transformFileContentsAsync(splashIntermediateFilename, fileString => {
      const parser = new DOMParser();
      const serializer = new XMLSerializer();
      const dom = parser.parseFromString(fileString);

      _setBackgroundColor(config, dom);
      _setBackgroundImageResizeMode(config, dom);

      return serializer.serializeToString(dom);
    });

    await _saveImageAssetsAsync(context);
  }

  if (context.type === 'user') {
    await spawnAsyncThrowError(
      '/bin/cp',
      [splashIntermediateFilename, path.join(supportingDirectory, 'LaunchScreen.xib')],
      {
        stdio: 'inherit',
      }
    );
  } else {
    const splashOutputFilename = path.join(supportingDirectory, 'Base.lproj', 'LaunchScreen.nib');
    await spawnAsyncThrowError('ibtool', [
      '--compile',
      splashOutputFilename,
      splashIntermediateFilename,
    ]);

    const generatedUnnecessaryNib = path.join(supportingDirectory, 'LaunchScreen.nib');
    if (fs.existsSync(generatedUnnecessaryNib)) {
      rimraf.sync(generatedUnnecessaryNib);
    }
  }

}

export { configureLaunchAssetsAsync };
