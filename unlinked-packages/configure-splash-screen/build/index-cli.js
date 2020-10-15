#!/usr/bin/env node
'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const cli_command_1 = __importDefault(require('./cli-command'));
async function runAsync() {
  try {
    await cli_command_1.default().parseAsync(process.argv);
  } catch (e) {
    console.error(`\n${e.message}\n`);
    process.exit(1);
  }
}
runAsync();
//# sourceMappingURL=index-cli.js.map
