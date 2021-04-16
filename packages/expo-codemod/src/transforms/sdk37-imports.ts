import { API, FileInfo, Identifier, JSXIdentifier, TSTypeParameter } from 'jscodeshift';

const allDeprecatedImports = new Map([
  ['AuthSession', { packageName: 'expo-auth-session' }],
  ['ScreenOrientation', { packageName: 'expo-screen-orientation' }],
]);

export default function transform(fileInfo: FileInfo, api: API, options: object) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const getFirstNode = () => root.find(j.Program).get('body', 0).node;
  const originalFirstNode = getFirstNode();
  const originalComments = originalFirstNode.comments;

  // import { Name } from 'expo';
  const expoImports = root
    .find(j.ImportDeclaration)
    .filter(path => path.node.source.value === 'expo');

  const importedModules: Map<
    string,
    Identifier | JSXIdentifier | TSTypeParameter | null
  > = new Map();

  expoImports
    .find(j.ImportSpecifier)
    .filter(p => allDeprecatedImports.has(p.node.imported.name))
    .forEach(path => {
      const importedName = path.node.imported.name;
      const local = path.node.local;
      importedModules.set(importedName, local ?? null);
      j(path).remove();
    });

  // import * as Expo from 'expo';
  expoImports.find(j.ImportNamespaceSpecifier).forEach(path => {
    if (path.node.local == null) return;

    const expoNamespace = path.node.local.name;
    root
      .find(j.MemberExpression)
      .filter(
        p =>
          (p.node.object.type === 'Identifier' || p.node.object.type === 'JSXIdentifier') &&
          (p.node.property.type === 'Identifier' || p.node.property.type === 'JSXIdentifier') &&
          p.node.object.name === expoNamespace &&
          allDeprecatedImports.has(p.node.property.name)
      )
      .forEach(p => {
        const property = p.node.property as Identifier | JSXIdentifier;
        const importedName = property.name;
        importedModules.set(importedName, null);
        p.replace(property);
      });
  });

  for (let [importedName, local] of [...importedModules.entries()].reverse()) {
    local = local || j.identifier(importedName);
    const info = allDeprecatedImports.get(importedName);
    if (!info) {
      return;
    }
    api.stats(info.packageName);

    const specifier = j.importNamespaceSpecifier(local);
    const newImport = j.importDeclaration([specifier], j.literal(info.packageName));
    expoImports.insertAfter(newImport);
  }

  const emptyImports = expoImports.filter(path => path.node.specifiers?.length === 0);
  emptyImports.remove();
  // If the first node has been modified or deleted, reattach the comments
  const firstNode = getFirstNode();
  if (firstNode !== originalFirstNode) {
    firstNode.comments = originalComments;
  }

  return root.toSource({ quote: 'single' });
}
