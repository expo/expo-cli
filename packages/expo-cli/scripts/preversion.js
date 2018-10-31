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
  \`expo start\` works without internet connection.
  (Use Network Link Conditioner with the the "100% Loss" profile, or turn off your wi-fi.)
${bold('2) Offline development, logged out')}:
  Same as (1), but first run \`expo logout\`
${bold('3) Eject')}: Create an app and eject it immediately. Check that it builds.

    expo init testapp --template blank
    cd testapp
    expo eject --eject-method expoKit
    expo start

    # In another terminal:
    # Test that it builds for iOS
    cd ios
    pod install
    open testapp.xcworkspace
    # then press "Run" in Xcode

    # Test that it builds for Android
    cd ../android
    ./gradlew installDevMinSdkDevKernelDebug`
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
