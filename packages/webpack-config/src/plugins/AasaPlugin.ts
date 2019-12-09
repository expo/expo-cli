import JsonPlugin from './JsonPlugin';

const domains = [
  // https://developer.apple.com/documentation/security/password_autofill/setting_up_an_app_s_associated_domains?language=objc
  'webcredentials',
  // https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/Handoff/AdoptingHandoff/AdoptingHandoff.html#//apple_ref/doc/uid/TP40014338-CH2-SW10
  'activitycontinuation',
];

export type AasaObject = {
  webcredentials?: { apps: string[] };
  activitycontinuation?: { apps: string[] };
  applinks?: {
    apps: [];
    details: Array<{ appID: string; paths: string[] }>;
  };
};

// mode: Mode;

type AnyAppAasaPluginProps = {
  // Array of strings that specify which paths are included or excluded from association.
  // You can use NOT to disable paths.
  paths: string[];
  associatedDomains: string[];
};

type SingleAppAasaPluginProps = AnyAppAasaPluginProps & {
  teamId: string;
  bundleId: string;
};

type MultiAppAasaPluginProps = AnyAppAasaPluginProps & {
  appIDs: string[];
};

function isDomainValid(domain: string, associatedDomains: string[]): boolean {
  return associatedDomains.some(link => link.startsWith(`${domain}:`));
}

function getValidFieldsFromDomains(associatedDomains: string[]): string[] {
  const validDomains: string[] = [];
  for (const domain of domains) {
    const hasDomains = isDomainValid(domain, associatedDomains);
    if (hasDomains) {
      validDomains.push(domain);
    }
  }
  return validDomains;
}

export function createAasaObjectForSingleApp({
  teamId,
  bundleId,
  paths,
  associatedDomains,
}: SingleAppAasaPluginProps): AasaObject {
  // Detect if we even need to create an aasa file before possibly throwing errors for missing fields.
  const validDomains: string[] = getValidFieldsFromDomains(associatedDomains);
  const nativeAppHasLinks = isDomainValid('applinks', associatedDomains);
  const hasUniversalLinks = !!paths.length && nativeAppHasLinks;
  const shouldCreateAasaFile = validDomains.length || hasUniversalLinks;

  if (!shouldCreateAasaFile) {
    // skip writing file
    return {};
  }

  if (!bundleId)
    throw new Error(
      'Cannot generate apple-app-site-association file unless the `expo.ios.bundleIdentifier` field is defined in your `app.json`'
    );
  if (!teamId)
    throw new Error(
      'Cannot generate apple-app-site-association file unless the `expo.ios.teamId` field is defined in your `app.json`'
    );

  // Built by combining your app’s Team ID (or the Apple App Prefix) and the Bundle Identifier.
  // <Team Identifier>.<Bundle Identifier>
  const appID = [teamId, bundleId].join('.');

  return createAasaObjectForMultiApp({
    appIDs: [appID],
    paths,
    associatedDomains,
  });
}

export function createAasaObjectForMultiApp({
  appIDs,
  paths,
  associatedDomains,
}: MultiAppAasaPluginProps): AasaObject {
  if (!Array.isArray(appIDs) || !appIDs.length) return {};

  const validDomains: string[] = getValidFieldsFromDomains(associatedDomains);
  const nativeAppHasLinks = isDomainValid('applinks', associatedDomains);
  const hasUniversalLinks = !!paths.length && nativeAppHasLinks;
  const shouldCreateAasaFile = validDomains.length || hasUniversalLinks;

  if (!shouldCreateAasaFile) {
    // skip writing file
    return {};
  }

  const aasa: { [key: string]: any } = {};

  for (const domain of validDomains) {
    aasa[domain] = { apps: appIDs };
  }

  if (hasUniversalLinks) {
    const details = appIDs.reduce(
      (prev, appID) => ({
        ...prev,
        // Repeating the paths for every app is based on popular websites like wikipedia:
        // https://www.wikipedia.org/apple-app-site-association
        [appID]: { paths },
      }),
      {}
    );
    aasa.applinks = {
      // The apps array must be present, but will always be empty.
      apps: [],
      details,
    };
  }

  return aasa;
}

// Should always comply with https://search.developer.apple.com/appsearch-validation-tool
class AasaPlugin extends JsonPlugin {
  static createSingleApp = (props: SingleAppAasaPluginProps): AasaPlugin => {
    const aasa = createAasaObjectForSingleApp(props);
    return new AasaPlugin({
      aasa,
    });
  };

  static createMultiApp = (props: MultiAppAasaPluginProps): AasaPlugin => {
    const aasa = createAasaObjectForMultiApp(props);
    return new AasaPlugin({
      aasa,
    });
  };

  constructor({ useWellKnown = true, aasa = {} }: { useWellKnown?: boolean; aasa: AasaObject }) {
    super({
      pretty: true,
      path: useWellKnown
        ? '/.well-known/apple-app-site-association'
        : '/apple-app-site-association',
      object: Object.keys(aasa).length ? aasa : null,
    });
  }
}

export default AasaPlugin;
