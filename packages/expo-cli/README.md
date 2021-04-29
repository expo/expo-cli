# Expo CLI

If you have problems with the code in this repository, please file issues & bug reports
at https://github.com/expo/expo-cli. Thanks!

## Installation

[Installation instructions and documentation here.](https://docs.expo.io/workflow/expo-cli/#installation)

## Getting Started

To make a new project use `expo init [path]`. The path is optional and it will use the current directory if not specified (all commands that need a path behave similarly).

## Viewing a Project on Your Phone

To view a project you must have an Expo CLI server running for that project. Run `expo start [path]` to start running the server. Once it is ready it'll output a URL for your project.

The server will continue running until you close it.

To view this on your phone, do the following:

- Go get the Expo app on your Android or iOS device. It's available [on the Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) and [on the iOS App Store](https://itunes.com/apps/exponent).

- Run `expo send` to send a link via email. You can also use the `--send-to` option when running `expo start`.

- Check your e-mail and tap the link. The Expo app should open and you should be able to view your experience there!

## Publishing a Project

To publish something you've made, just follow these steps:

- Create an Expo account or login to an existing one by running `expo login`.
- Run an Expo CLI server usingTo run your project, navigate to the directory and run one of the following yarn commands.

yarn start # you can open iOS, Android, or web from here, or run them directly with the commands below.

yarn android

yarn ios # requires an iOS device or macOS for access to an iOS simulator

yarn web

yarn web
yarn run v1.22.10
$ expo start --web.
- Check to make sure you can load your app by opening it in the Expo app.
- Once everything looks good, run `expo publish`. A few seconds later, you should get a clean URL sent to you that points to the exp.host server where your package was published to.

You can publish as many times as you want and it will replace your old version, so don't worry about making a mistake!
