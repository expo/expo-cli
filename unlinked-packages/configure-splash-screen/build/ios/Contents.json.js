'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.writeContentsJsonFile = void 0;
const fs_extra_1 = __importDefault(require('fs-extra'));
async function writeContentsJsonFile(contentsJsonFilePath, filename, darkModeFilename) {
  const images = [
    {
      idiom: 'universal',
      filename,
      scale: '1x',
    },
    {
      appearances: [
        {
          appearance: 'luminosity',
          value: 'dark',
        },
      ],
      idiom: 'universal',
      filename: darkModeFilename,
      scale: '1x',
    },
    {
      idiom: 'universal',
      scale: '2x',
    },
    {
      appearances: [
        {
          appearance: 'luminosity',
          value: 'dark',
        },
      ],
      idiom: 'universal',
      scale: '2x',
    },
    {
      idiom: 'universal',
      scale: '3x',
    },
    {
      appearances: [
        {
          appearance: 'luminosity',
          value: 'dark',
        },
      ],
      idiom: 'universal',
      scale: '3x',
    },
  ].filter(el => {
    var _a, _b;
    return ((_b = (_a = el.appearances) === null || _a === void 0 ? void 0 : _a[0]) === null ||
    _b === void 0
      ? void 0
      : _b.value) === 'dark'
      ? Boolean(darkModeFilename)
      : true;
  });
  const contentsJson = {
    images,
    info: {
      version: 1,
      author: 'xcode',
    },
  };
  await fs_extra_1.default.writeFile(contentsJsonFilePath, JSON.stringify(contentsJson, null, 2));
}
exports.writeContentsJsonFile = writeContentsJsonFile;
//# sourceMappingURL=Contents.json.js.map
