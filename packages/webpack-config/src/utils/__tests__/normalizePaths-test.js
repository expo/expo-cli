import normalizePaths from '../normalizePaths';

it('transforms deep nested obejct', () => {
  const object = normalizePaths(
    {
      prop1: '/foo/bar/1',
      prop2: true,
      prop3: 20,
      prop4: {
        nestedProp1: '/foo/bar/2',
        nestedProp2: false,
        nestedProp3: 20,
        nestedProp4: ['/foo/bar/3', true, 20, {}, [40]],
        nestedProp5: null,
        nestedProp6: undefined,
      },
      prop5: [
        '/foo/bar/4',
        false,
        10,
        {
          arrayProp1: '/foo/bar/5',
          arrayProp2: false,
        },
        ['/foo/bar/6'],
        null,
      ],
      prop6: null,
      prop7: undefined,
    },
    value => value.split('/foo').pop()
  );

  expect(object).toMatchSnapshot();
});
