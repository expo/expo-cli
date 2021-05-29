#!/usr/bin/env node

require('../build/cli.js')
  .runAsync(process.argv)
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
