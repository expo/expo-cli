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
