export interface CredentialsProvider {
  readonly platform: 'android' | 'ios';
  hasRemoteAsync(): Promise<boolean>;
  hasLocalAsync(): Promise<boolean>;
  useRemoteAsync(): Promise<void>;
  useLocalAsync(): Promise<void>;
  isLocalSyncedAsync(): Promise<boolean>;
}
