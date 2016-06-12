function CommandError(code, message) {
  var err = new Error(message);
  err.code = code;
  err._isCommandError = true;
  return err;
}

CommandError.isCommandError = function (err) {
  return (err && !!err._isCommandError);
};

export default CommandError;
