const LEFT_BRACKETS = ['(', '{'] as const;
const RIGHT_BRACKETS = [')', '}'] as const;

type LeftBracket = typeof LEFT_BRACKETS[number];
type RightBracket = typeof RIGHT_BRACKETS[number];
type Bracket = LeftBracket | RightBracket;

export function findMatchingBracketPosition(content: string, bracket: Bracket): number {
  // search first occurrence of `bracket`
  const firstBracketPos = content.indexOf(bracket);
  if (firstBracketPos < 0) {
    return -1;
  }

  let stackCounter = 0;
  const matchingBracket = getMatchingBracket(bracket);

  if (isLeftBracket(bracket)) {
    const contentLength = content.length;
    // search forward
    for (let i = firstBracketPos + 1; i < contentLength; ++i) {
      const c = content[i];
      if (c === bracket) {
        stackCounter += 1;
      } else if (c === matchingBracket) {
        if (stackCounter === 0) {
          return i;
        }
        stackCounter -= 1;
      }
    }
  } else {
    // search bakcward
    for (let i = firstBracketPos - 1; i >= 0; --i) {
      const c = content[i];
      if (c === bracket) {
        stackCounter += 1;
      } else if (c === matchingBracket) {
        if (stackCounter === 0) {
          return i;
        }
        stackCounter -= 1;
      }
    }
  }

  return -1;
}

function isLeftBracket(bracket: Bracket): boolean {
  const leftBracketList: readonly Bracket[] = LEFT_BRACKETS;
  return leftBracketList.includes(bracket);
}

function getMatchingBracket(bracket: Bracket): Bracket {
  switch (bracket) {
    case '(':
      return ')';
    case ')':
      return '(';
    case '{':
      return '}';
    case '}':
      return '{';
  }
}
