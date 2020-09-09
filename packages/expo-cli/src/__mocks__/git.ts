const gitStatusAsync = jest.fn();
const gitDiffAsync = jest.fn();
const gitAddAsync = jest.fn();

async function gitDoesRepoExistAsync(): Promise<boolean> {
  return true;
}

async function gitRootDirectory(): Promise<string> {
  return '.';
}

export { gitStatusAsync, gitDiffAsync, gitAddAsync, gitDoesRepoExistAsync, gitRootDirectory };
