/**
 * @flow
 */

const updateSymbol = Symbol(); // a unique key to mark an object on whether we should perform an update
class Updater {
  constructor(updateAllFn) {
    this.updateAllFn = updateAllFn;
  }

  async updateAllAsync(objs: Array<Object>) {
    const taggedObjs = objs.filter(obj => obj[updateSymbol]);
    clearTags(objs);
    return await this.updateAllFn(taggedObjs);
  }
}

function tagForUpdate(obj: Object) {
  obj[updateSymbol] = true;
  return obj;
}

function clearTags(objs: Array<Object>) {
  objs.forEach(obj => delete obj[updateSymbol]);
}

export { Updater, tagForUpdate, clearTags };
