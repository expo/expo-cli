import program from 'commander';

export function isNonInteractive() {
  return program.nonInteractive;
}
