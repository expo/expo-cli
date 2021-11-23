import chalk from 'chalk';
import terminalLink from 'terminal-link';
// @ts-ignore
import TurndownService from 'turndown';
import wrapAnsi from 'wrap-ansi';

const turndownServices: Record<string, any> = {};

function getService(rootUrl: string) {
  if (turndownServices[rootUrl]) {
    return turndownServices[rootUrl];
  }
  const turndownService = new TurndownService();
  turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement(content: string): string {
      return chalk.strikethrough(content);
    },
  });
  turndownService.addRule('strong', {
    filter: ['strong', 'b'],
    replacement(content: string): string {
      return chalk.bold(content);
    },
  });
  turndownService.addRule('emphasis', {
    filter: ['em', 'i'],
    replacement(content: string): string {
      return chalk.italic(content);
    },
  });
  turndownService.addRule('heading', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement(content: string): string {
      return '\n' + chalk.bold(content) + '\n';
    },
  });
  turndownService.addRule('inlineLink', {
    filter(node: any, options: any) {
      return options.linkStyle === 'inlined' && node.nodeName === 'A' && node.getAttribute('href');
    },
    replacement(content: string, node: any) {
      let href = node.getAttribute('href');
      if (href.startsWith('/')) href = `${rootUrl}${href}`;
      if (terminalLink.isSupported) {
        return chalk.cyan(terminalLink(content, href));
      }
      return `${chalk.cyan(content)} (${chalk.underline(href)})`;
    },
  });

  turndownServices[rootUrl] = turndownService;
  return turndownService;
}

export function convertHTMLToASCII({
  content,
  rootUrl,
}: {
  content: string;
  rootUrl: string;
}): string {
  const service = getService(rootUrl);
  return wrapAnsi(service.turndown(content), process.stdout.columns || 80);
}
