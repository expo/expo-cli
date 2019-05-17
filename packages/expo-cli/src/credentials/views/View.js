/* @flow */
import { Context } from '../schema';

export class View {
  // context: Object = {}'
  async open(context: Context) {
    throw new Error('not implemented');
  }
}
