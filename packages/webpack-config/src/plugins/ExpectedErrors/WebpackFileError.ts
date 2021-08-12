import chalk from 'chalk';

export class WebpackFileError extends Error {
  // Webpack special cases a public file prop.
  file: string;

  constructor(
    file: {
      filePath: string | null;
      line?: number | null;
      col?: number | null;
    },
    message: string
  ) {
    super(message);
    this.file = formatPaths(file);
  }
}

function formatPaths(config: {
  filePath: string | null;
  line?: number | null;
  col?: number | null;
}) {
  const filePath = chalk.reset.cyan(config.filePath);
  return filePath + chalk.gray(`:${[config.line, config.col].filter(Boolean).join(':')}`);
}
