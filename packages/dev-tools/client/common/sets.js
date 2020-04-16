export const swap = (a, x, y) => {
  if (a.length === 1) return a;
  const result = [...a];
  result.splice(y, 1, result.splice(x, 1, result[y])[0]);
  return result;
};
