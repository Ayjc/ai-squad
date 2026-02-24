import { invoke } from '@tauri-apps/api/core';

export interface RetentionConfig {
  max_bytes: number;
  max_days: number;
}

export interface AppConfig {
  concurrency_limit: number;
  context_max_chars: number;
  retention: RetentionConfig;
}

export async function getConfig(): Promise<AppConfig> {
  return await invoke<AppConfig>('get_config');
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await invoke('save_config_cmd', { config });
}
