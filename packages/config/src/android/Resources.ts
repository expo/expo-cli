import fs from 'fs-extra';
import path from 'path';

import { XMLObject } from './XML';

export type ResourceXML = {
  resources: XMLObject;
};

export type ResourceItemXML = {
  _: string;
  $: {
    name: string;
  };
};
/**
 * Name of the resource folder.
 */
export type ResourceKind = 'values' | 'values-night' | 'values-v23';
