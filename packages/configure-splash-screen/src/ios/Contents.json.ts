import fs from 'fs-extra';

export async function writeContentsJsonFile(
  contentsJsonFilePath: string,
  filename: string,
  darkModeFilename?: string
) {
  const images: {
    idiom: 'universal';
    filename?: string;
    scale: '1x' | '2x' | '3x';
    appearances?: {
      appearance: 'luminosity';
      value: 'dark';
    }[];
  }[] = [
    {
      idiom: 'universal' as const,
      filename,
      scale: '1x' as const,
    },
    {
      appearances: [
        {
          appearance: 'luminosity' as const,
          value: 'dark' as const,
        },
      ],
      idiom: 'universal' as const,
      filename: darkModeFilename,
      scale: '1x' as const,
    },
    {
      idiom: 'universal' as const,
      scale: '2x' as const,
    },
    {
      appearances: [
        {
          appearance: 'luminosity' as const,
          value: 'dark' as const,
        },
      ],
      idiom: 'universal' as const,
      scale: '2x' as const,
    },
    {
      idiom: 'universal' as const,
      scale: '3x' as const,
    },
    {
      appearances: [
        {
          appearance: 'luminosity' as const,
          value: 'dark' as const,
        },
      ],
      idiom: 'universal' as const,
      scale: '3x' as const,
    },
  ].filter(el => (el.appearances?.[0]?.value === 'dark' ? Boolean(darkModeFilename) : true));

  const contentsJson = {
    images,
    info: {
      version: 1,
      author: 'xcode',
    },
  };

  await fs.writeFile(contentsJsonFilePath, JSON.stringify(contentsJson, null, 2));
}
