import * as xdl from '@expo/development-support';

type MockedXDLModules = Partial<Record<keyof typeof xdl, object>>;

function mockExpoXDL(mockedXDLModules: MockedXDLModules): void {
  jest.mock('@expo/development-support', () => {
    const pkg = jest.requireActual('@expo/development-support');
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
