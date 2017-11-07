/*
 * @flow
 */

export default (typeof FormData !== 'undefined' ? FormData : require('form-data'));
