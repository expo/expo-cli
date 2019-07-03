declare module 'probe-image-size' {
  import { ReadStream } from 'fs';

  type ProbeResult = {
    width: number;
    height: number;
    type: 'bmp' | 'gif' | 'jpg' | 'png' | 'psd' | 'svg' | 'tiff' | 'webp';
    mime: string;
    wUnits: 'in' | 'mm' | 'cm' | 'pt' | 'pc' | 'px' | 'em' | 'ex';
    hUnits: 'in' | 'mm' | 'cm' | 'pt' | 'pc' | 'px' | 'em' | 'ex';
  };

  function get_image_size(
    src: ReadStream | string,
    options?: any,
    callback?: (error: Error | null, result: ProbeResult) => void
  ): Promise<ProbeResult>;

  export = get_image_size;
}
