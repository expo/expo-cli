export interface CredentialsProvider {
  readonly platform: 'android' | 'ios';
  hasRemoteAsync(): Promise<boolean>;
  hasLocalAsync(): Promise<boolean>;
  isLocalSyncedAsync(): Promise<boolean>;
}
