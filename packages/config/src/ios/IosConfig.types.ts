export type URLScheme = {
  CFBundleURLName?: string;
  CFBundleURLSchemes: [string];
};

export type InfoPlist = {
  CFBundleShortVersionString?: string;
  CFBundleVersion?: string;
  CFBundleDisplayName?: string;
  CFBundleName?: string;
  CFBundleURLTypes?: Array<URLScheme>;
};
