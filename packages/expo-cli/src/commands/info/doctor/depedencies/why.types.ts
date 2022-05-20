export interface CommonNodePackage<TVersion extends string> {
  /**
   * Name of the input package.
   *
   * @example `@expo/config-plugins`
   */
  name: PackageName;
  version: TVersion;
  location: Location;
  isWorkspace: boolean;
  dependents: Dependent[];
}

export interface RootNodePackage extends CommonNodePackage<VersionSpec> {
  dev: boolean;
  optional: boolean;
  devOptional: boolean;
  peer: boolean;
  bundled: boolean;
}

export interface NodePackage extends Partial<CommonNodePackage<ExactVersion>> {
  linksIn?: NodePackage[];
}

export interface Dependent {
  name: PackageName;
  type: DependentType;
  /** Version expression. @example `^4.0.14` */
  spec: VersionSpec;

  from: NodePackage;
}

export type DependentType = 'dev' | 'optional' | 'peer' | 'peerOptional' | 'prod' | 'workspace';

/**
 *
 * A few examples from running `npm why @expo/config-plugins --json` in `expo/expo` during SDK 45.
 *
 * @example `apps/bare-expo`
 * @example `/Users/evanbacon/Documents/GitHub/expo`
 * @example `home`
 * @example `node_modules/@expo/dev-server`
 * @example `node_modules/@expo/prebuild-config/node_modules/@expo/config`
 * @example `packages/expo`
 */
export type Location = string;

/**
 *
 * A few examples from running `npm why @expo/config-plugins --json` in `expo/expo` during SDK 45.
 *
 * @example `bare-expo`
 * @example `home`
 * @example `@expo/dev-server`
 * @example `@expo/config`
 */
export type PackageName = string;

/** Version expression. Not to be confused with an exact semver version. @example `^4.0.14` */
export type VersionSpec = string;

/** Exact NPM package semver version. Not to be confused with an version range or expression. @example `1.0.0` */
export type ExactVersion = string;
