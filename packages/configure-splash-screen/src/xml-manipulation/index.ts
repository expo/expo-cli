import { Element, js2xml, xml2js, Attributes } from 'xml-js';
import deepEqual from 'deep-equal';

import { readFileWithFallback, createDirAndWriteFile } from '../file-helpers';

type ExplicitNewValue<T> = { newValue: T };
type WithExplicitNewValue<T> = T | ExplicitNewValue<T>;

type ExpectedElementAttributes = Record<string, WithExplicitNewValue<string | number | undefined>>;
type WithExplicitIndex<T> = T & { idx?: number };
type WithDeletionFlag<T> = T & { deletionFlag?: boolean };

type ExpectedElements = WithExplicitNewValue<
  WithExplicitIndex<WithDeletionFlag<ExpectedElement>>[]
>;

export type ExpectedElementType = {
  name: string;
  attributes?: ExpectedElementAttributes;
  elements?: ExpectedElements;
};

export type ExpectedElementsType = {
  elements: ExpectedElements;
};

export type ExpectedCommentType = {
  comment: string;
};

export type ExpectedTextType = {
  text: string | number | boolean;
};

export type ExpectedElement =
  | ExpectedElementType
  | ExpectedElementsType
  | ExpectedCommentType
  | ExpectedTextType;

function isElementType(el: ExpectedElement): el is ExpectedElementType {
  return (el as ExpectedElementType).name !== undefined;
}

function isElementsType(el: ExpectedElement): el is ExpectedElementsType {
  return !(el as ExpectedElementType).name && Boolean((el as ExpectedElementsType).elements);
}

function isCommentType(el: ExpectedElement): el is ExpectedCommentType {
  return (el as ExpectedCommentType).comment !== undefined;
}

function isTextType(el: ExpectedElement): el is ExpectedTextType {
  return (el as ExpectedTextType).text !== undefined;
}

function isExplicitNewValue<T>(el: WithExplicitNewValue<T>): el is ExplicitNewValue<T> {
  // @ts-ignore
  return typeof el === 'object' && el.hasOwnProperty('newValue');
}

function unboxExplicitNewValue<T>(el: WithExplicitNewValue<T>): T {
  return isExplicitNewValue(el) ? el.newValue : el;
}

function compareElements(element: Element, expectedElement: ExpectedElement): boolean {
  if (isTextType(expectedElement)) {
    return element.type === 'text';
  }

  if (isCommentType(expectedElement)) {
    return element.type === 'comment' && element.comment?.trim() === expectedElement.comment.trim();
  }

  if (isElementType(expectedElement) && element.type === 'element') {
    if (expectedElement.name !== element.name) {
      return false;
    }

    if (!element.attributes) {
      return true;
    }

    for (const [key, value] of Object.entries(
      (expectedElement as ExpectedElementType).attributes || {}
    )) {
      if (isExplicitNewValue(value)) {
        // this attribute has to be overridden
        continue;
      }
      if (element.attributes[key] !== value) {
        return false;
      }
    }
    return true;
  }

  return false;
}

function sortWithExplicitIndex<T>(elements?: WithExplicitIndex<T>[]): T[] | undefined {
  if (!elements) {
    return;
  }
  const result: T[] = new Array(elements.length);
  const elementsWithExplicitIndices = elements.filter(({ idx }) => idx !== undefined);
  const elementsWithoutExplicitIndices = elements.filter(({ idx }) => idx === undefined);
  elementsWithoutExplicitIndices.forEach((el, idx) => (result[idx] = el));
  elementsWithExplicitIndices.forEach(({ idx, ...el }, i) => {
    // @ts-ignore
    result.splice(idx ?? i, 0, el);
  });
  return result;
}

function mergeXmlElementsLists(
  current?: Element[],
  expected?: ExpectedElements
): Element[] | undefined {
  if (isExplicitNewValue(expected) || !current) {
    const sortedExpected = sortWithExplicitIndex(unboxExplicitNewValue(expected));
    return sortedExpected?.map(convertToElement);
  }
  if (!expected) {
    return current;
  }

  const result: WithExplicitIndex<WithDeletionFlag<Element>>[] = [];

  for (const currentElement of current) {
    const idxInExpected = expected.findIndex(el => compareElements(currentElement, el));
    if (idxInExpected !== -1) {
      const { idx, ...element } = expected.splice(idxInExpected, 1)[0];
      if (!element.deletionFlag) {
        result.push({ idx, ...mergeXmlElements(currentElement, element) });
      }
    } else {
      result.push(currentElement);
    }
  }
  result.push(
    ...expected
      .filter(({ deletionFlag }) => !deletionFlag)
      .map(({ idx, ...el }) => ({ idx, ...convertToElement(el) }))
  );
  const sortedResult = sortWithExplicitIndex(result);
  return sortedResult;
}

function convertToElement({
  idx,
  ...expectedElement
}: WithExplicitIndex<ExpectedElement>): Element {
  // @ts-ignore
  if (expectedElement.deletionFlag) {
    throw new Error('Cannot convert ExpectedElement to Element when deletionFlag is set');
  }

  if (isCommentType(expectedElement)) {
    return {
      ...expectedElement,
      type: 'comment',
    };
  }
  if (isTextType(expectedElement)) {
    return {
      ...expectedElement,
      type: 'text',
    };
  }
  if (isElementsType(expectedElement)) {
    return {
      elements: unboxExplicitNewValue(expectedElement.elements)
        .filter(({ deletionFlag }) => !deletionFlag)
        .map(convertToElement),
      type: 'element',
    };
  }
  const { elements, attributes, ...expectedRest } = expectedElement;
  const result: Element = {
    ...expectedRest,
    type: 'element',
  };
  if (attributes) {
    result.attributes = convertExpectedAttributes(attributes);
  }
  if (elements) {
    result.elements = unboxExplicitNewValue(elements)
      .filter(({ deletionFlag }) => !deletionFlag)
      .map(convertToElement);
  }
  return result;
}

function convertExpectedAttributes(
  expectedAttributes?: ExpectedElementAttributes
): Attributes | undefined {
  if (expectedAttributes) {
    const result = Object.entries(expectedAttributes).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: unboxExplicitNewValue(value),
      }),
      {}
    );
    return result;
  }
  return undefined;
}

function mergeAndConvertToElement(
  { attributes: currentAttributes, ...currentRest }: Omit<Element, 'elements'>,
  { attributes: expectedAttributes, ...expectedRest }: Omit<ExpectedElementType, 'elements'>
): Element {
  const result: Element = {
    ...currentRest,
    ...expectedRest,
  };
  const attributes = (currentAttributes || expectedAttributes) && {
    ...currentAttributes,
    ...convertExpectedAttributes(expectedAttributes),
  };
  if (attributes) {
    result.attributes = attributes;
  }
  return result;
}

/**
 * Assumption is that elements are `equal` semantically
 */
export function mergeXmlElements(current: Element, expected: ExpectedElement): Element {
  if (isCommentType(expected)) {
    return {
      ...current,
      ...expected,
      type: 'comment',
    };
  }

  if (isTextType(expected)) {
    return {
      ...current,
      ...expected,
      type: 'text',
    };
  }

  if (isElementsType(expected)) {
    const result = {
      ...current,
      type: 'element',
    };
    const elements = mergeXmlElementsLists(current.elements, expected.elements);
    if (elements) {
      result.elements = elements;
    }
    return result;
  }

  const { elements: currentElements, ...currentRest } = current;
  const { elements: expectedElements, ...expectedRest } = expected;

  const elements = mergeXmlElementsLists(current.elements, expected.elements);
  const result = {
    ...mergeAndConvertToElement(currentRest, expectedRest),
    type: 'element',
  };
  if (elements) {
    result.elements = elements;
  }
  return result;
}

/**
 * @param filePath
 * @param fallbackContent
 */
export async function readXmlFile(
  filePath: string,
  fallbackContent: Element | string = `<?xml version="1.0" encoding="utf-8"?>`
): Promise<Element> {
  const fileContent = await readFileWithFallback(
    filePath,
    typeof fallbackContent === 'string' ? fallbackContent : 'fallbackToElement'
  );
  if (fileContent === 'fallbackToElement' && typeof fallbackContent === 'object') {
    return fallbackContent;
  }
  const fileXml = xml2js(fileContent);
  return fileXml as Element;
}

export async function writeXmlFile(filePath: string, xml: Element) {
  const fileXml = js2xml(xml, { indentAttributes: true, spaces: 2 });
  const correctedFile = fileXml.replace(
    /(?<openTag><[^\s]+)\n *(?<firstAttribute> [^\s]+=".+?")\n *((?<secondAttribute> [^\s]+=".+?")\n *)?(?<closeTag>[/?]?>)/g,
    '$1$2$4$5'
  );
  await createDirAndWriteFile(filePath, `${correctedFile}\n`);
}

/**
 * Checks whether two xmlElements are equal in terms of their structure
 */
export function xmlElementsEqual(
  a: Element,
  b: Element,
  { disregardComments = true }: { disregardComments?: boolean } = {}
): boolean {
  const filteredA = !disregardComments ? a : removeComments(a);
  const filteredB = !disregardComments ? b : removeComments(b);
  return deepEqual(filteredA, filteredB);
}

function removeComments(e: Element): Element | undefined {
  if (e.type === 'comment') {
    return;
  }
  const result = Object.entries(e)
    .map(([key, value]): [string, any] => {
      if (key === 'elements' && Array.isArray(value)) {
        const filteredValue = value
          .map(removeComments)
          .filter((el): el is Element => el !== undefined);
        return [key, filteredValue.length > 0 ? filteredValue : undefined];
      }
      return [key, value];
    })
    .filter(([_, value]) => value !== undefined)
    .reduce((acc, [key, value]) => {
      // @ts-ignore
      acc[key] = value;
      return acc;
    }, {});
  return result;
}
