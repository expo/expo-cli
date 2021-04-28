import * as fs from 'fs';
import * as path from 'path';
import { isURL } from 'xdl/build/UrlUtils';

import CommandError from '../../CommandError';

export function resolveTemplateOption(template: string) {
  // TODO: Resolve earlier
  if (isURL(template, {})) {
    throw new CommandError('template of type URL is not supported');
  }
  const templatePath = path.resolve(template);
  if (!fs.existsSync(templatePath)) {
    throw new CommandError('template file does not exist: ' + templatePath);
  }
  return templatePath;
}
