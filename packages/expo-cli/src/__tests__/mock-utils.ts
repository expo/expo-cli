import * as xdl from 'xdl';

type MockedXDLModules = Partial<Record<keyof typeof xdl, object>>;

function mockExpoXDL(mockedXDLModules: MockedXDLModules): void {
  jest.mock('xdl', () => {
    const pkg = jest.requireActual('xdl');
    const xdlMock = { ...pkg };
    for (const [name, value] of Object.entries(mockedXDLModules)) {
      xdlMock[name] = {
        ...pkg[name],
        ...value,
      };
    }
    return xdlMock;
  });
}

export { mockExpoXDL };
