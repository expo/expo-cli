import prompts from 'prompts';

type InteractionOptions = { pause: boolean; canEscape?: boolean };

type InteractionCallback = (options: InteractionOptions) => void;

const listeners: InteractionCallback[] = [];

/**
 * Used to pause/resume interaction observers while prompting (made for TerminalUI).
 *
 * @param callback
 */
export function addInteractionListener(callback: InteractionCallback) {
  listeners.push(callback);
}

export function removeInteractionListener(callback: InteractionCallback) {
  const listenerIndex = listeners.findIndex(_callback => _callback === callback);
  if (listenerIndex === -1) {
    throw new Error(
      'Logger.removeInteractionListener(): cannot remove an unregistered event listener.'
    );
  }
  listeners.splice(listenerIndex, 1);
}

export function pauseInteractions(options: Omit<InteractionOptions, 'pause'> = {}) {
  for (const listener of listeners) {
    listener({ pause: true, ...options });
  }
}

export function resumeInteractions(options: Omit<InteractionOptions, 'pause'> = {}) {
  for (const listener of listeners) {
    listener({ pause: false, ...options });
  }
}

export async function confirmAsync(options: {
  initial?: boolean;
  message: string;
}): Promise<boolean> {
  pauseInteractions();
  const { value } = await prompts({
    type: 'confirm',
    name: 'value',
    ...options,
  });
  resumeInteractions();
  return value;
}
