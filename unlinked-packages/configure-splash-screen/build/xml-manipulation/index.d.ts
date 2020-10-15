import { Element } from 'xml-js';
declare type ExplicitNewValue<T> = {
  newValue: T;
};
declare type WithExplicitNewValue<T> = T | ExplicitNewValue<T>;
declare type ExpectedElementAttributes = Record<
  string,
  WithExplicitNewValue<string | number | undefined>
>;
declare type WithExplicitIndex<T> = T & {
  idx?: number;
};
declare type WithDeletionFlag<T> = T & {
  deletionFlag?: boolean;
};
declare type ExpectedElements = WithExplicitNewValue<
  WithExplicitIndex<WithDeletionFlag<ExpectedElement>>[]
>;
export declare type ExpectedElementType = {
  name: string;
  attributes?: ExpectedElementAttributes;
  elements?: ExpectedElements;
};
export declare type ExpectedElementsType = {
  elements: ExpectedElements;
};
export declare type ExpectedCommentType = {
  comment: string;
};
export declare type ExpectedTextType = {
  text: string | number | boolean;
};
export declare type ExpectedElement =
  | ExpectedElementType
  | ExpectedElementsType
  | ExpectedCommentType
  | ExpectedTextType;
/**
 * Assumption is that elements are `equal` semantically
 */
export declare function mergeXmlElements(current: Element, expected: ExpectedElement): Element;
/**
 * @param filePath
 * @param fallbackContent
 */
export declare function readXmlFile(
  filePath: string,
  fallbackContent?: Element | string
): Promise<Element>;
export declare function writeXmlFile(filePath: string, xml: Element): Promise<void>;
/**
 * Checks whether two xmlElements are equal in terms of their structure
 */
export declare function xmlElementsEqual(
  a: Element,
  b: Element,
  {
    disregardComments,
  }?: {
    disregardComments?: boolean;
  }
): boolean;
/**
 * Check if given `element` has some meaningful data:
 * - if so: write it to the file
 * - if no: remove file completely
 * Function assumes that the structure of the input `element` is correct (`element.elements[name = resources]`).
 */
export declare function writeXmlFileOrRemoveFileUponNoResources(
  filePath: string,
  element: Element,
  {
    disregardComments,
  }?: {
    disregardComments?: boolean;
  }
): Promise<void>;
export {};
