import * as osascript from '@expo/osascript';
import spawnAsync from '@expo/spawn-async';
import editors from 'env-editor';

import Log from '../../log';

function guessEditor() {
  if (process.env.EXPO_EDITOR) {
    return editors.getEditor(process.env.EXPO_EDITOR);
  }

  try {
    return editors.defaultEditor();
  } catch {
    return editors.getEditor('vscode');
  }
}

export async function openInEditorAsync(path: string, options: { editor?: string } = {}) {
  const editor = options.editor ? editors.getEditor(options.editor) : guessEditor();

  if (process.platform === 'darwin') {
    // This will use the ENV var $EXPO_EDITOR if set, or else will try various
    // popular editors, looking for one that is open, or if none are, one that is installed
    await osascript.openInEditorAsync(path, editor.name);
  }

  if (!editor) {
    Log.error(
      'Could not find your editor, you can set it by defining $EXPO_EDITOR environment variable (e.g. "code" or "atom")'
    );
    return;
  }

  const stdio = editor.isTerminalEditor ? 'inherit' : 'ignore';
  const editorProcess = spawnAsync(editor.binary, [path], { stdio, detached: true });
  editorProcess.child.unref();
  return editorProcess;
}
