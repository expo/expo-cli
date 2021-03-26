#!/usr/bin/env node

async function updateCaches() {}

updateCaches().catch(error => {
  console.error(error);
  process.exit(1);
});
