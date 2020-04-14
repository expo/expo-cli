import editors from 'env-editor';
import open from 'open';
import log from '../../log';

export function guessEditor() {
  try {
    return editors.defaultEditor();
  } catch {
    return editors.getEditor('vscode');
  }
}

export async function startEditorAsync(path: string, options: { editor?: string } = {}) {
  const editor = options.editor ? editors.getEditor(options.editor) : guessEditor();

  if (editor) {
    try {
      await open(path, { app: editor.binary });
      return true;
    } catch {}
  }

  log.error(
    'Could not open editor, you can set it by defining the $EDITOR env var with the binary of your editor. (e.g. "code" or "atom")'
  );
  return false;
}
