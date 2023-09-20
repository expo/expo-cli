import * as path from 'path';

import { isValidPng } from '..';

describe('Image #isValidPng', () => {
  it('returns false if the file does not exist', async () => {
    expect(await isValidPng('random/path')).toBe(false);
  });

  it('returns false if the file is a jpg', async () => {
    expect(await isValidPng(path.join(__dirname, '/assets/icon.jpg'))).toBe(false);
  });

  it('returns false if the file is a svg', async () => {
    expect(await isValidPng(path.join(__dirname, '/assets/icon.svg'))).toBe(false);
  });

  it('returns false if the file is a pdf', async () => {
    expect(await isValidPng(path.join(__dirname, '/assets/icon.pdf'))).toBe(false);
  });

  it('returns false if the file is a jpg with the file exstention chaneg to png', async () => {
    expect(await isValidPng(path.join(__dirname, '/assets/fakePng.png'))).toBe(false);
  });

  it('returns true if the file is a png', async () => {
    expect(await isValidPng(path.join(__dirname, '/assets/icon.png'))).toBe(true);
  });
});
