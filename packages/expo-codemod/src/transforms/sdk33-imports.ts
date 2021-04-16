import {
  API,
  FileInfo,
  Identifier,
  ImportDeclaration,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  JSCodeshift,
  JSXIdentifier,
  TSTypeParameter,
} from 'jscodeshift';

const namedImports = new Map([
  ['Accelerometer', 'expo-sensors'],
  ['AdMobBanner', 'expo-ads-admob'],
  ['AdMobInterstitial', 'expo-ads-admob'],
  ['AdMobRewarded', 'expo-ads-admob'],
  ['Asset', 'expo-asset'],
  ['Audio', 'expo-av'],
  ['BarCodeScanner', 'expo-barcode-scanner'],
  ['Barometer', 'expo-sensors'],
  ['BlurView', 'expo-blur'],
  ['Camera', 'expo-camera'],
  ['GLView', 'expo-gl'],
  ['Gyroscope', 'expo-sensors'],
  ['LinearGradient', 'expo-linear-gradient'],
  ['Magnetometer', 'expo-sensors'],
  ['MagnetometerUncalibrated', 'expo-sensors'],
  ['PublisherBanner', 'expo-ads-admob'],
  ['SQLite', 'expo-sqlite'],
  ['Video', 'expo-av'],
  ['WebView', 'react-native-webview'],
]);

const defaultImports = new Map([
  ['Constants', 'expo-constants'],
  ['KeepAwake', 'expo-keep-awake'],
  ['MapView', 'react-native-maps'],
]);

const namespaceImports = new Map([
  ['Amplitude', 'expo-analytics-amplitude'],
  ['AppAuth', 'expo-app-auth'],
  ['BackgroundFetch', 'expo-background-fetch'],
  ['Brightness', 'expo-brightness'],
  ['Calendar', 'expo-calendar'],
  ['Contacts', 'expo-contacts'],
  ['Crypto', 'expo-crypto'],
  ['DocumentPicker', 'expo-document-picker'],
  ['Facebook', 'expo-facebook'],
  ['FacebookAds', 'expo-ads-facebook'],
  ['FaceDetector', 'expo-face-detector'],
  ['FileSystem', 'expo-file-system'],
  ['Font', 'expo-font'],
  ['GestureHandler', 'react-native-gesture-handler'],
  ['GL', 'expo-gl'],
  ['GoogleSignIn', 'expo-google-sign-in'],
  ['Haptic', 'expo-haptics'],
  ['Haptics', 'expo-haptics'],
  ['Icon', '@expo/vector-icons'],
  ['ImageManipulator', 'expo-image-manipulator'],
  ['ImagePicker', 'expo-image-picker'],
  ['IntentLauncher', 'expo-intent-launcher'],
  ['IntentLauncherAndroid', 'expo-intent-launcher'],
  ['LocalAuthentication', 'expo-local-authentication'],
  ['Localization', 'expo-localization'],
  ['Location', 'expo-location'],
  ['MailComposer', 'expo-mail-composer'],
  ['MediaLibrary', 'expo-media-library'],
  ['Permissions', 'expo-permissions'],
  ['Print', 'expo-print'],
  ['Random', 'expo-random'],
  ['SecureStore', 'expo-secure-store'],
  ['Segment', 'expo-analytics-segment'],
  ['Sensors', 'expo-sensors'],
  ['Sharing', 'expo-sharing'],
  ['SMS', 'expo-sms'],
  ['Speech', 'expo-speech'],
  ['Svg', 'react-native-svg'],
  ['TaskManager', 'expo-task-manager'],
  ['WebBrowser', 'expo-web-browser'],
]);

const allDeprecatedImports = new Map();
for (const [name, packageName] of namedImports) {
  allDeprecatedImports.set(name, { type: 'ImportSpecifier', packageName });
}
for (const [name, packageName] of defaultImports) {
  allDeprecatedImports.set(name, { type: 'ImportDefaultSpecifier', packageName });
}
for (const [name, packageName] of namespaceImports) {
  allDeprecatedImports.set(name, { type: 'ImportNamespaceSpecifier', packageName });
}

export default function transform(fileInfo: FileInfo, api: API, options: object) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const getFirstNode = () => root.find(j.Program).get('body', 0).node;
  const originalFirstNode = getFirstNode();
  const originalComments = originalFirstNode.comments;

  // import { Name } from 'expo';
  const expoImports = root
    .find(j.ImportDeclaration)
    .filter(path => path.node.source.value === 'expo');

  const importedModules: Map<
    string,
    Identifier | JSXIdentifier | TSTypeParameter | null
  > = new Map();

  expoImports
    .find(j.ImportSpecifier)
    .filter(p => allDeprecatedImports.has(p.node.imported.name))
    .forEach(path => {
      const importedName = path.node.imported.name;
      const local = path.node.local;
      importedModules.set(importedName, local ?? null);
      j(path).remove();
    });

  // import * as Expo from 'expo';
  expoImports.find(j.ImportNamespaceSpecifier).forEach(path => {
    if (path.node.local == null) return;

    const expoNamespace = path.node.local.name;
    root
      .find(j.MemberExpression)
      .filter(
        p =>
          (p.node.object.type === 'Identifier' || p.node.object.type === 'JSXIdentifier') &&
          (p.node.property.type === 'Identifier' || p.node.property.type === 'JSXIdentifier') &&
          p.node.object.name === expoNamespace &&
          allDeprecatedImports.has(p.node.property.name)
      )
      .forEach(p => {
        const property = p.node.property as Identifier | JSXIdentifier;
        const importedName = property.name;
        importedModules.set(importedName, null);
        p.replace(property);
      });
  });

  for (let [importedName, local] of importedModules.entries()) {
    local = local || j.identifier(importedName);
    const info = allDeprecatedImports.get(importedName);
    if (!info) {
      return;
    }
    api.stats(info.packageName);

    let specifier;
    if (info.type === 'ImportSpecifier') {
      specifier = j.importSpecifier(j.identifier(importedName), local);
    } else if (info.type === 'ImportDefaultSpecifier') {
      specifier = j.importDefaultSpecifier(local);
    } else {
      specifier = j.importNamespaceSpecifier(local);
    }

    const existingImports = findNonNamespaceImports(j, root, info.packageName);
    if (existingImports.size() && specifier.type !== 'ImportNamespaceSpecifier') {
      const specifiers = existingImports.get(0).node.specifiers;
      specifiers.push(specifier);
      specifiers.sort(specifierCompare);
    } else {
      const newImport = j.importDeclaration([specifier], j.literal(info.packageName));
      expoImports.insertAfter(newImport);
    }
  }

  const emptyImports = expoImports.filter(path => path.node.specifiers?.length === 0);
  emptyImports.remove();
  // If the first node has been modified or deleted, reattach the comments
  const firstNode = getFirstNode();
  if (firstNode !== originalFirstNode) {
    firstNode.comments = originalComments;
  }

  return root.toSource({ quote: 'single' });
}

function findNonNamespaceImports(j: JSCodeshift, root: any, sourceName: string) {
  return root.find(j.ImportDeclaration).filter((path: any) => {
    const node = path.node as ImportDeclaration;
    return (
      node.source.value === sourceName &&
      node.specifiers?.some(
        specifier =>
          specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier'
      )
    );
  });
}

function sortableName(
  specifier: ImportSpecifier | ImportNamespaceSpecifier | ImportDefaultSpecifier
) {
  if (specifier.local) {
    return specifier.local.name;
  }
  return '';
}

function specifierCompare(
  a: ImportSpecifier | ImportNamespaceSpecifier | ImportDefaultSpecifier,
  b: ImportSpecifier | ImportNamespaceSpecifier | ImportDefaultSpecifier
) {
  return sortableName(a).localeCompare(sortableName(b), 'en');
}
