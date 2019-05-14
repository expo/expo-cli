/**
 * @flow
 */

class Updater {
  constructor(updateAllFn) {
    this.updateAllFn = updateAllFn;
  }

  async updateAllAsync(objs: Array<Object>) {
    const taggedObjs = objs.filter(obj => obj._shouldUpdate);
    clearTags(objs);
    return await this.updateAllFn(taggedObjs);
  }
}

function tagForUpdate(obj: Object) {
  obj._shouldUpdate = true;
  return obj;
}

function clearTags(objs: Array<Object>) {
  objs.forEach(obj => delete obj._shouldUpdate);
}

export { Updater, tagForUpdate, clearTags };
