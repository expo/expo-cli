import type { ImageOptions } from '@expo/image-utils';
import type { ExpoConfig } from 'expo/config';

type ExpoWebConfig = Required<ExpoConfig>['web'];

export type WebPlatformConfigWithDefaults = Omit<ExpoWebConfig, 'build' | 'lang' | 'meta'> &
  Required<Pick<ExpoWebConfig, 'build' | 'lang' | 'meta'>>;

export type PWAConfig = ExpoConfig & { web: WebPlatformConfigWithDefaults };

export type Direction = 'ltr' | 'rtl' | 'auto';

export type Display = 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';

export type Orientation =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'omit';

export type CrossOrigin = 'use-credentials' | 'anonymous';

export interface RelatedApplications {
  platform?: string;
  url: string;
  id?: string;
}

export type Manifest = Partial<{
  background_color: string;
  description: string;
  dir: Direction;
  display: Display;
  lang: string;
  name: string;
  orientation: Orientation;
  prefer_related_applications: boolean;
  related_applications: RelatedApplications[];
  scope: string;
  short_name: string;
  start_url: string;
  theme_color: string;
  crossorigin: CrossOrigin;
}>;

export type WebpackAsset = {
  source: Buffer;
  path: string;
};

export type HtmlTag = {
  tagName: 'link';
  attributes: { rel?: string; href?: string; media?: string; sizes?: string; type?: string };
};

export type SplashIcon = ImageOptions & {
  media: string;
};

export type ProjectOptions = {
  projectRoot: string;
  publicPath: string;
  // unimp
  destination?: string;
};

export type HTMLOutput = { asset: WebpackAsset; tag?: HtmlTag; manifest?: ManifestIcon };

export type IconOptions = Omit<ImageOptions, 'name' | 'width' | 'height'>;
export type ManifestIcon = { src: string; sizes: string; type: 'image/png'; purpose?: string };
