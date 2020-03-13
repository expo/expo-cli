/**
 * Turn a tag definition into a html string
 * @param {HtmlTagObject} tagDefinition
 *  A tag element according to the htmlWebpackPlugin object notation
 *
 * @param xhtml {boolean}
 *   Wether the generated html should add closing slashes to be xhtml compliant
 */
export function htmlTagObjectToString(
  tagDefinition: {
    tagName: string;
    voidTag?: boolean;
    innerHTML?: string;
    attributes: Record<string, string | undefined | boolean>;
  },
  xhtml: boolean = false
): string {
  const attributes = Object.keys(tagDefinition.attributes || {})
    .filter(function(attributeName) {
      return tagDefinition.attributes[attributeName] !== false;
    })
    .map(function(attributeName) {
      if (tagDefinition.attributes[attributeName] === true) {
        return xhtml ? attributeName + '="' + attributeName + '"' : attributeName;
      }
      return attributeName + '="' + tagDefinition.attributes[attributeName] + '"';
    });
  return (
    '<' +
    [tagDefinition.tagName].concat(attributes).join(' ') +
    (tagDefinition.voidTag && xhtml ? '/' : '') +
    '>' +
    (tagDefinition.innerHTML || '') +
    (tagDefinition.voidTag ? '' : '</' + tagDefinition.tagName + '>')
  );
}
