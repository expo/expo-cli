import fetch from 'node-fetch';
/** Check if a request to the given URL is `ok` (status 200). */
export async function isUrlOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}
