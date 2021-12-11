class MessageScrubber {
  private matchANSIEscapeCodesRegex: RegExp;
  private matchFilePathRegex: RegExp;
  private matchNewLineRegex: RegExp;
  private matchAccountNamesRegex: RegExp;

  constructor() {
    const matchANSIEscapeCodes = `\\x1B|\\[[0-9]{1,2}m`;
    this.matchANSIEscapeCodesRegex = new RegExp(matchANSIEscapeCodes, 'gm');
    // ensures firstCharacter is not preceeded by https: (uses positive look behind)
    const preceededByWhitespaceOrQuote = `(?<=[\\s'"])`;
    // examples: ./ | ../ | / | C:\\ | E:/ | @/assets/ (uses character range + repitition + alternation)
    const captureSlashOrLetterColon = `(@?[\\\\/]|[\\\\/]{1,2}|[.]{1,2}[\\/]{1,2}|[A-Z]:[\\\\/])`;
    // (uses possessive search + character range)
    const captureUntileNewlineOrQuoteOrColon = `([^'"\r\n\t\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff:]+)`;
    const filePath = `${preceededByWhitespaceOrQuote}${captureSlashOrLetterColon}${captureUntileNewlineOrQuoteOrColon}`;
    this.matchFilePathRegex = new RegExp(filePath, 'gm');
    const matchNewLines = `[\n\r]`;
    this.matchNewLineRegex = new RegExp(matchNewLines, 'gm');
    const matchAccountNames = `@\\w(-?\\w)*(?!-$)`;
    this.matchAccountNamesRegex = new RegExp(matchAccountNames, 'gm');
  }

  scrubMessage(message: string): string {
    const messageWithoutColor = message.replace(this.matchANSIEscapeCodesRegex, '');
    const messageWithoutPaths = messageWithoutColor.replace(this.matchFilePathRegex, '...');
    const messageWithoutAccountNames = messageWithoutPaths.replace(
      this.matchAccountNamesRegex,
      '[account]'
    );
    const formattedMessage = messageWithoutAccountNames
      .split(this.matchNewLineRegex)
      .map(x => x.trim())
      .filter(x => !!x)
      .join(' ');

    return formattedMessage;
  }
}

export default new MessageScrubber();
