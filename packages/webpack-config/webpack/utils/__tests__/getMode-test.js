import getMode from '../getMode';

describe('getMode', () => {
  it('boolean', () => {
    expect(getMode({ production: true })).toBe('production');
    expect(getMode({ development: true })).toBe('development');
  });
  it('mode', () => {
    expect(getMode({ mode: 'production' })).toBe('production');
    expect(getMode({ development: true, mode: 'production' })).toBe('production');

    expect(getMode({ mode: 'invalid' })).toBe('development');
  });
  it('env', () => {
    const mode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(getMode({})).toBe('production');
    process.env.NODE_ENV = mode;
  });
});
