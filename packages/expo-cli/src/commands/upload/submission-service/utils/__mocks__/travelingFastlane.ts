async function _runTravelingFastlaneAsync(
  command: string,
  args: ReadonlyArray<string>,
  envs?: Record<string, string>
): Promise<{ [key: string]: any }> {
  return {};
}
const runTravelingFastlaneAsync = jest.fn(_runTravelingFastlaneAsync);

export { runTravelingFastlaneAsync };
