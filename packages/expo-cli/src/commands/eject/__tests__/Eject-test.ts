import { stripDashes } from '../Eject';

describe('stripDashes', () => {
  it(`removes spaces and dashes from a string`, () => {
    expect(stripDashes(' My cool-app ')).toBe('Mycoolapp');
    expect(stripDashes(' --- - ----- ')).toBe('');
    expect(stripDashes('-----')).toBe('');
    expect(stripDashes(' ')).toBe('');
    expect(stripDashes(' \n-\n-')).toBe('');
  });
});
