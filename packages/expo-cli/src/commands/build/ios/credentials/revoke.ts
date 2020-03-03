import prompt from '../../../../prompt';
import {
  AppleCtx,
  DistCertManager,
  ProvisioningProfileManager,
  PushKeyInfo,
  PushKeyManager,
  createManagers,
} from '../../../../appleApi';

type AnyManager = DistCertManager | PushKeyManager | ProvisioningProfileManager;

async function revoke(
  appleCtx: AppleCtx,
  typesToRevoke: string[],
  projectMetadata: { bundleIdentifier?: string } = {}
): Promise<void> {
  const managers = createManagers(appleCtx) as Record<string, any>;
  for (const type of typesToRevoke) {
    const manager = managers[type];
    if (manager) {
      await _revokeByType(manager, projectMetadata);
    }
  }
}

async function _revokeByType(
  manager: AnyManager,
  projectMetadata: { bundleIdentifier?: string }
): Promise<void> {
  if (manager instanceof ProvisioningProfileManager) {
    const { bundleIdentifier } = projectMetadata;
    await manager.revoke(bundleIdentifier!);
    return;
  }

  if (manager.list) {
    const list = await manager.list();
    if (!list?.length) {
      return;
    }
    const choices = list.map((cert: PushKeyInfo) => ({
      // @ts-ignore: Type 'PushKeyInfo' is missing the following properties from type 'DistCertInfo': status, created, expires, ownerType, and 3 more.
      name: manager.format(cert),
      value: cert.id,
    }));
    const ids = await _askWhatToRevoke(choices);
    await manager.revoke(ids);
  } else {
    // @ts-ignore: An argument for 'ids' was not provided.
    await manager.revoke();
  }
}

async function _askWhatToRevoke(choices: { name: string; value: string }[]): Promise<string[]> {
  const { ids } = await prompt({
    type: 'checkbox',
    name: 'ids',
    message: `What would you like to revoke?`,
    pageSize: Infinity,
    choices,
  });
  return ids;
}

export default revoke;
