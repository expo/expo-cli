export type ResizeMode = 'contain' | 'cover' | 'fill' | 'inside' | 'outside';

export type ImageFormat = 'input' | 'jpeg' | 'jpg' | 'png' | 'raw' | 'tiff' | 'webp';

export type ImageOptions = {
  src: string;
  name?: string;
  resizeMode: ResizeMode;
  backgroundColor: string;
  width: number;
  height: number;
  padding?: number;
};
