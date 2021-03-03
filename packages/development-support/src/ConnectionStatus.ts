let offline: boolean = false;

export function setIsOffline(bool: boolean): void {
  offline = bool;
}

export function isOffline(): boolean {
  return offline;
}
