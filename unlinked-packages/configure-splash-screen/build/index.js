'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.SplashScreenStatusBarStyle = exports.SplashScreenImageResizeMode = exports.configureAndroidSplashScreen = exports.configureIosSplashScreen = void 0;
var ios_1 = require('./ios');
Object.defineProperty(exports, 'configureIosSplashScreen', {
  enumerable: true,
  get() {
    return __importDefault(ios_1).default;
  },
});
var android_1 = require('./android');
Object.defineProperty(exports, 'configureAndroidSplashScreen', {
  enumerable: true,
  get() {
    return __importDefault(android_1).default;
  },
});
var constants_1 = require('./constants');
Object.defineProperty(exports, 'SplashScreenImageResizeMode', {
  enumerable: true,
  get() {
    return constants_1.SplashScreenImageResizeMode;
  },
});
Object.defineProperty(exports, 'SplashScreenStatusBarStyle', {
  enumerable: true,
  get() {
    return constants_1.SplashScreenStatusBarStyle;
  },
});
//# sourceMappingURL=index.js.map
