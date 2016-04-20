// jest.unmock('../');
// jest.unmock('path');
jest.autoMockOff();

import path from 'path';

describe('require', () => {
  it("requires xdl and makes sure there are no errors", () => {
    let xdl = require('../');
  });
});
