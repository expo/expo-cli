import * as xdl from '@expo/xdl';

type MockedXDLModules = Partial<Record<keyof typeof xdl, object>>;

function mockExpoXDL(mockedXDLModules: MockedXDLModules): void {
  jest.mock('@expo/xdl', () => {
    const pkg = jest.requireActual('@expo/xdl');
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
