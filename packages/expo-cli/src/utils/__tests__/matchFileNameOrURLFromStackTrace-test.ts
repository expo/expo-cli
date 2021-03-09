import { matchFileNameOrURLFromStackTrace } from '../matchFileNameOrURLFromStackTrace';

describe(matchFileNameOrURLFromStackTrace, () => {
  it(`matches a Metro URL`, () => {
    expect(
      matchFileNameOrURLFromStackTrace(
        'http://127.0.0.1:19000/index.bundle?platform=ios&dev=true&hot=false&minify=false:110910:3 in global code'
      )
    ).toBe('http://127.0.0.1:19000/index.bundle?platform=ios&dev=true&hot=false&minify=false');
  });
  it(`matches a Metro file path`, () => {
    expect(
      matchFileNameOrURLFromStackTrace(
        'node_modules/react-native/Libraries/LogBox/LogBox.js:117:10 in registerWarning'
      )
    ).toBe('node_modules/react-native/Libraries/LogBox/LogBox.js');
  });
  it(`matches a Metro file path (short)`, () => {
    expect(matchFileNameOrURLFromStackTrace('somn.js:1:0 in <global>')).toBe('somn.js');
  });
  it(`returns null for malformed stack lines`, () => {
    // no ` in `
    expect(matchFileNameOrURLFromStackTrace('somn.js:1:0')).toBe(null);
  });
  it(`splits even when the location is missing the character number`, () => {
    expect(matchFileNameOrURLFromStackTrace('somn.js:1 in <global>')).toBe('somn.js');
  });
  it(`splits without a location`, () => {
    expect(matchFileNameOrURLFromStackTrace('somn.js in <global>')).toBe('somn.js');
  });
});
