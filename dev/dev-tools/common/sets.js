export const swap = (a, x, y) => {
  if (a.length === 1) return a;
  a.splice(y, 1, a.splice(x, 1, a[y])[0]);
  return a;
};

export const findIndex = (arr, id) => {
  return arr.findIndex(each => each.id === id);
};

export const getById = (arr, id) => {
  return arr.find(each => each.id === id);
};

export const alphabetize = arr => {
  const sortedArray = [...arr];

  return sortedArray.sort((a, b) => {
    var nameA = a.name.toUpperCase();
    var nameB = b.name.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    return 0;
  });
};
