import fetch from 'node-fetch';

export async function getSchemaAsync(sdkVersion: string): Promise<any> {
  const result = await fetch(
    `https://exp.host/--/api/v2/project/configuration/schema/${sdkVersion}`
  );
  const resultJson = await result.json();
  return resultJson.data.schema;
}
