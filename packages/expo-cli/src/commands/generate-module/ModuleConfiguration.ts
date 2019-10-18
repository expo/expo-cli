export interface ModuleConfiguration {
  /**
   * Name of the module from `package.json`.
   */
  npmModuleName: string;

  /**
   * Name od `Pod` for `cocoapods` package manages in iOS.
   */
  podName: string;

  /**
   * Package name for Android library.
   */
  javaPackage: string;

  /**
   * Name of the module in JS/TS codebase.
   */
  jsModuleName: string;

  /**
   * Indicates whether module have native ViewManager.
   */
  viewManager: boolean;
}
