import { ResizeMode } from '@expo/image-utils';

export interface IOSManifestLink {
  media: string;
  href: string;
  size?: string;
  valid?: 'startup' | 'icon';
}

export interface HTMLManifestLink {
  rel: string;
  href: string;
  crossorigin?: string;
}

export interface ManifestProps {
  noResources: boolean;
  filename: string;
  publicPath: string;
  HtmlWebpackPlugin: any;
}

export type Tags = { [key: string]: Tag[] | Tag };

export interface Tag {
  name?: string;
  content?: string;
  rel?: 'apple-touch-startup-image' | 'apple-touch-icon' | string;
  href?: string;
  media?: string;
  crossorigin?: string;
  sizes?: string;
}

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
export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
}

export interface Icon {
  src: string;
  resizeMode: ResizeMode;
  size?: string | number;
  sizes?: number[];
  type?: string;
  destination?: string;
  media?: string; // TODO: Bacon
  color?: string;
  ios?: IOSManifestLink;
}

export type StartupImage = {
  ios: 'startup';
  src: string;
  sizes: number[][];
  scale: number;
  media: string;
  destination: string | undefined;
  resizeMode: ResizeMode;
  color: string | undefined;
};

export interface ManifestOptions {
  background_color?: string;
  description?: string;
  dir?: Direction;
  display?: Display;
  fingerprints?: boolean;
  filename?: string;
  icons?: Icon | Icon[];
  inject?: boolean;
  lang?: string;
  name: string;
  orientation?: Orientation;
  publicPath?: string;
  prefer_related_applications?: boolean;
  related_applications?: RelatedApplications[];
  scope?: string;
  short_name?: string;
  start_url?: string;
  theme_color?: string;
  crossorigin?: CrossOrigin;
  startupImages?: any;
}
