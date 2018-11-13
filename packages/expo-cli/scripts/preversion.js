let { bold } = require('chalk');
let boxen = require('boxen');
let inquirer = require('inquirer');

console.log(
  boxen(bold("Please complete these checks before publishing the 'expo-cli' package:"), {
    padding: 1,
  }) +
    `
${bold('1) Offline development')}:
  Check that you're logged in (\`expo whoami\`) and then make sure
  \`<repo-dir>/packages/expo-cli/bin/expo.js start --offline\` works without internet connection.
  (Use Network Link Conditioner with the the "100% Loss" profile, or turn off your wi-fi.)
${bold('2) Offline development, logged out')}:
  Run \`expo logout\` and then \`<repo-dir>/packages/expo-cli/bin/expo.js start\`.
${bold('3) Eject')}: Create an app and eject it immediately. Check that it builds.

    <repo-dir>/packages/expo-cli/bin/expo.js init testapp --template blank
    cd testapp
    <repo-dir>/packages/expo-cli/bin/expo.js eject --eject-method expoKit
    <repo-dir>/packages/expo-cli/bin/expo.js start

    # In another terminal:
    # Test that it builds for iOS
    cd ios
    pod install
    open testapp.xcworkspace
    # then press "Run" in Xcode

    # Test that it builds for Android
    cd ../android
    ./run.sh`
);

let CHECKLIST = ['I have completed all the checks'];

inquirer
  .prompt({
    type: 'confirm',
    name: 'completed',
    message: 'Have you completed all the checks?',
    default: false,
  })
  .then(answer => {
    if (!answer.completed) {
      console.error('Please complete all the checks before continuing.');
      process.exit(1);
    }
  });
