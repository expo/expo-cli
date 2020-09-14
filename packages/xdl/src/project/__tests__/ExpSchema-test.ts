import { getAssetSchemasAsync } from '../ExpSchema';

it(`asset schemas return an array of strings`, async () => {
  const schemas = await getAssetSchemasAsync('38.0.0');
  expect(schemas.every(field => typeof field === 'string')).toBe(true);
  expect(schemas.includes('icon')).toBe(true);
});
