import {
  appendContentsInsideDeclarationBlock,
  findNewInstanceCodeBlock,
  insertContentsAtOffset,
  replaceContentsWithOffset,
} from '../androidCode';

describe(findNewInstanceCodeBlock, () => {
  it('should support classic new instance - java', () => {
    const contents = 'final Foo instance = new Foo();';
    expect(findNewInstanceCodeBlock(contents, 'Foo', 'java')).toEqual({
      start: 21,
      end: 29,
      code: 'new Foo()',
    });
  });

  it('should support classic new instance - kotlin', () => {
    const contents = 'val instance = Foo()';
    expect(findNewInstanceCodeBlock(contents, 'Foo', 'kt')).toEqual({
      start: 15,
      end: 19,
      code: 'Foo()',
    });
  });

  it('should support anonymous class new instance - java', () => {
    const contents = [
      'final Runnable runnable = new Runnable() {',
      '  @Override',
      '  public void run() {',
      '    Log.i(TAG, "runnable");',
      '  }',
      '};',
    ].join('\n');
    expect(findNewInstanceCodeBlock(contents, 'Runnable', 'java')).toEqual({
      start: 26,
      end: 109,
      code: [
        'new Runnable() {',
        '  @Override',
        '  public void run() {',
        '    Log.i(TAG, "runnable");',
        '  }',
        '}',
      ].join('\n'),
    });
  });

  it('should support anonymous class new instance - kotlin', () => {
    const contents = [
      'val runnable = object : Runnable() {',
      '  override fun run() {',
      '    Log.i(TAG, "runnable")',
      '  }',
      '}',
    ].join('\n');
    expect(findNewInstanceCodeBlock(contents, 'Runnable', 'kt')).toEqual({
      start: 15,
      end: 91,
      code: [
        'object : Runnable() {',
        '  override fun run() {',
        '    Log.i(TAG, "runnable")',
        '  }',
        '}',
      ].join('\n'),
    });
  });

  it('should return null if not found', () => {
    const contents = 'final Foo instance = new Foo();';
    expect(findNewInstanceCodeBlock(contents, 'Bar', 'java')).toBe(null);
  });
});

describe(appendContentsInsideDeclarationBlock, () => {
  it('should support class declaration', () => {
    const contents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
  }
}`;

    const expectContents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
  }

  public void foo() {
    System.out.println("Hello foo!");
  }
}`;

    expect(
      appendContentsInsideDeclarationBlock(
        contents,
        'public class App',
        `
  public void foo() {
    System.out.println("Hello foo!");
  }\n`
      )
    ).toEqual(expectContents);
  });

  it('should support method declaration', () => {
    const contents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
  }
}`;

    const expectContents = `
public class App {
  public static void main(String[] args) {
    System.out.println("Hello App!");
    System.out.println("Hello from generated code.");
  }
}`;

    expect(
      appendContentsInsideDeclarationBlock(
        contents,
        'public static void main',
        '  System.out.println("Hello from generated code.");\n  '
      )
    ).toEqual(expectContents);
  });
});

describe(insertContentsAtOffset, () => {
  it('should insert in the middle', () => {
    expect(insertContentsAtOffset('aabbcc', 'dd', 4)).toEqual('aabbddcc');
  });

  it('should insert at the head', () => {
    expect(insertContentsAtOffset('aabbcc', 'dd', 0)).toEqual('ddaabbcc');
  });

  it('should insert at the tail', () => {
    expect(insertContentsAtOffset('aabbcc', 'dd', 6)).toEqual('aabbccdd');
  });

  it('should throw for boundary errors', () => {
    expect(() => {
      insertContentsAtOffset('aabbcc', 'dd', -1);
    }).toThrow();
    expect(() => {
      insertContentsAtOffset('aabbcc', 'dd', 999);
    }).toThrow();
  });
});

describe(replaceContentsWithOffset, () => {
  it('should support replacement in the middle', () => {
    expect(replaceContentsWithOffset('abc', 'd', 1, 1)).toEqual('adc');
    expect(replaceContentsWithOffset('aabbcc', '', 2, 3)).toEqual('aacc');
    expect(replaceContentsWithOffset('aabbcc', 'dd', 2, 3)).toEqual('aaddcc');
    expect(replaceContentsWithOffset('aabbcc', 'ExtendString', 2, 3)).toEqual('aaExtendStringcc');
  });

  it('should throw for boundary errors', () => {
    expect(() => {
      replaceContentsWithOffset('aabbcc', 'dd', -1, -1);
    }).toThrow();
    expect(() => {
      replaceContentsWithOffset('aabbcc', 'dd', 0, 999);
    }).toThrow();
    expect(() => {
      replaceContentsWithOffset('aabbcc', 'dd', 2, 1);
    }).toThrow();
  });
});
