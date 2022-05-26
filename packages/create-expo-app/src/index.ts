// Set the title of the process
process.title = 'create-expo-app';

// Setup before requiring `debug`.
if (require('getenv').boolish('EXPO_DEBUG', false)) {
  if (!process.env.DEBUG) {
    process.env.DEBUG = '';
  } else {
    // Ensure we stack our debug calls on top of the existing debug calls.
    process.env.DEBUG += ',';
  }
  process.env.DEBUG += 'expo:init:*';
}

require('./cli');
