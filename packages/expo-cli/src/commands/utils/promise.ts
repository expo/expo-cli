/**
 * An implementation of Promise.sleep.
 *
 * @param ms A number of milliseconds to sleep.
 * @returns A promise that resolves after the provided number of milliseconds.
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

export { sleep };
