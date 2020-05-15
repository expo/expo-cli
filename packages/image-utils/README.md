# `@expo/image-utils`

A library for image processing functionality in Expo CLI. It uses `sharp` for image processing if it's available through a global `sharp-cli` installation. Otherwise it uses `jimp`, a Node library with no native dependencies, and warns the user that they may want to install `sharp-cli` for faster image processing.