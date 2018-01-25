"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
function CommandError(code, message) {
  var err = new Error(message);
  err.code = code;
  err._isCommandError = true;
  return err;
}

CommandError.isCommandError = function (err) {
  return err && !!err._isCommandError;
};

exports.default = CommandError;
module.exports = exports["default"];
//# sourceMappingURL=__sourcemaps__/CommandError.js.map
