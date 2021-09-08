// TODO: Use a script tag with loading properties like webpack's `__webpack_require__.l`
export async function requestAsync(url: string, reqHeaders: Record<string, string> = {}) {
  // @ts-ignore
  const data = await fetch(url, {
    headers: reqHeaders,
  });
  return {
    body: (await data.text()) ?? null,
    headers: data.headers,
  };
}
