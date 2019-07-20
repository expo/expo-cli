module.exports = function normalizePaths(initial, transformString) {
  if (typeof initial === 'string') {
    return transformString(initial);
  } else if (typeof initial === 'object') {
    let result = {};
    for (const prop of Object.keys(initial)) {
      result[prop] = normalizePaths(initial[prop], transformString);
    }
    return result;
  } else if (Array.isArray(initial)) {
    return initial.map(value => normalizePaths(value, transformString));
  } else {
    return initial;
  }
};
