type MockedXDLModules = Partial<Record<keyof typeof import('xdl'), object>>;
type MockedAPIModules = Partial<Record<keyof typeof import('@expo/api'), object>>;

export function mockExpoXDL(mockedXDLModules: MockedXDLModules): void {
  jest.mock('xdl', () => {
    const pkg = jest.requireActual('xdl');
    const custom = { ...pkg };

    const isFunction = (obj: any): obj is Function => typeof obj === 'function';
    for (const [name, value] of Object.entries(mockedXDLModules)) {
      if ((value as any)?._isMockFunction || isFunction(value)) {
        custom[name] = value;
      } else {
        custom[name] = {
          ...pkg[name],
          ...value,
        };
      }
    }
    return custom;
  });
}

export function mockExpoAPI(mocked: MockedAPIModules): void {
  jest.mock('@expo/api', () => {
    const pkg = jest.requireActual('@expo/api');
    const custom = { ...pkg };
    const isFunction = (obj: any): obj is Function => typeof obj === 'function';
    for (const [name, value] of Object.entries(mocked)) {
      if (isFunction(value)) {
        custom[name] = value;
      } else {
        custom[name] = {
          ...pkg[name],
          ...value,
        };
      }
    }
    return custom;
  });
}
