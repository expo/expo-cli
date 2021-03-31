import { API, ASTNode, FileInfo } from 'jscodeshift';

function renameImportSource(node?: ASTNode | null) {
  if (
    node != null &&
    'value' in node &&
    typeof node.value === 'string' &&
    (node.value === '@react-native-community/async-storage' ||
      node.value.startsWith('@react-native-community/async-storage/'))
  ) {
    node.value = node.value.replace(
      '@react-native-community/async-storage',
      '@react-native-async-storage/async-storage'
    );
  }
}

export default function transform(fileInfo: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // import AsyncStorage from '@react-native-community/async-storage';
  root.find(j.ImportDeclaration).forEach(path => {
    renameImportSource(path.node.source);
  });

  // export default from '@react-native-community/async-storage/jest/async-storage-mock';
  root.find(j.ExportNamedDeclaration).forEach(path => {
    renameImportSource(path.node.source);
  });

  // require('@react-native-community/async-storage');
  root
    .find(j.CallExpression, {
      type: 'CallExpression',
      callee: { name: 'require' },
    })
    .forEach(path => renameImportSource(path.node));

  // jest.mock('@react-native-community/async-storage', () => mockAsyncStorage);
  root
    .find(j.CallExpression, {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'jest' },
        property: {
          type: 'Identifier',
          name: 'mock',
        },
      },
    })
    .forEach(path => renameImportSource(path.node.arguments[0]));

  return root.toSource({ quote: 'single' });
}
