import spawnAsync from '@expo/spawn-async';
import { FileSystem } from '@expo/xdl';
import editors from 'env-editor';

import log from '../../log';

export function guessEditor() {
  if (process.env.EXPO_EDITOR) {
    return editors.getEditor(process.env.EXPO_EDITOR);
  }

  try {
    return editors.defaultEditor();
  } catch {
    return editors.getEditor('vscode');
  }
}

export async function startProjectInEditorAsync(path: string, options: { editor?: string } = {}) {
  try {
    return await FileSystem.openProjectInEditorAsync(path);
  } catch {}

  const editor = options.editor ? editors.getEditor(options.editor) : guessEditor();

  if (!editor) {
    log.error(
      'Could not find your editor, you can set it by defining $EXPO_EDITOR environment variable (e.g. "code" or "atom")'
    );
    return;
  }

  const stdio = editor.isTerminalEditor ? 'inherit' : 'ignore';
  const editorProcess = spawnAsync(editor.binary, [path], { stdio, detached: true });
  editorProcess.child.unref();
  return editorProcess;
}
