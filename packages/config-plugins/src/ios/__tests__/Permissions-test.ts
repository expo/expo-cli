import { applyPermissions } from '../Permissions';

describe(applyPermissions, () => {
  it(`applies permissions`, () => {
    expect(
      applyPermissions(
        { baz: 'new', foo: null, echo: 'delta' },
        {
          foo: 'bar',
          baz: 'fox',
        }
      )
    ).toStrictEqual({ baz: 'new', echo: 'delta' });
  });
});
