import * as apple from '../appleApi';
import prompt from '../../../../prompt';

async function revoke(appleCtx, typesToRevoke) {
  const managers = apple.createManagers(appleCtx);
  for (const type of typesToRevoke) {
    const manager = managers[type];
    if (manager) {
      await _revokeByType(manager);
    }
  }
}

async function _revokeByType(manager) {
  if (manager.list) {
    const list = await manager.list();
    if (!list || list.length === 0) {
      return;
    }
    const choices = list.map(cert => ({ name: manager.format(cert), value: cert.id }));
    const ids = await _askWhatToRevoke(choices);
    await manager.revoke(ids);
  } else {
    await manager.revoke();
  }
}

async function _askWhatToRevoke(choices) {
  const { ids } = await prompt({
    type: 'checkbox',
    name: 'ids',
    message: `What would you like to revoke?`,
    choices,
  });
  return ids;
}

export default revoke;
