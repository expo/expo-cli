import { isNode } from './EnvironmentHelper';

export default (typeof FormData !== 'undefined'
  ? FormData
  : require('form-data'));

export function append(
  formData: FormData,
  name: string,
  value: any,
  options: ?Object
) {
  if (isNode()) {
    formData.append(name, value, options);
  } else {
    if (options) {
      formData.append(name, new File([value], name), options.filename);
    } else {
      formData.append(name, value);
    }
  }
}
