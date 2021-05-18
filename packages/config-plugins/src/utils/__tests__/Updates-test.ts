import { getUpdateUrl } from '../Updates';

it(`returns correct default values from all getters if no value provided.`, () => {
  const url = 'https://u.expo.dev/00000000-0000-0000-0000-000000000000';
  expect(getUpdateUrl({ updates: { url }, slug: 'foo' }, 'user')).toBe(url);
});

it(`returns null if neither 'updates.url' or 'user' is supplied.`, () => {
  expect(getUpdateUrl({ slug: 'foo' }, null)).toBe(null);
});

it(`returns correct legacy urls if 'updates.url' is not provided, but 'slug' and ('username'|'owner') are provided.`, () => {
  expect(getUpdateUrl({ slug: 'my-app' }, 'user')).toBe('https://exp.host/@user/my-app');
  expect(getUpdateUrl({ slug: 'my-app', owner: 'owner' }, 'user')).toBe(
    'https://exp.host/@owner/my-app'
  );
  expect(getUpdateUrl({ slug: 'my-app', owner: 'owner' }, null)).toBe(
    'https://exp.host/@owner/my-app'
  );
});
