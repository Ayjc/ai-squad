import { invoke } from '@tauri-apps/api/core';

export async function setApiKey(providerId: string, apiKey: string): Promise<void> {
  await invoke('set_api_key', { providerId, apiKey });
}

export async function hasApiKey(providerId: string): Promise<boolean> {
  return await invoke<boolean>('has_api_key', { providerId });
}

// Only use for explicit user actions (e.g. copy/show). Most UI should not need this.
export async function revealApiKey(providerId: string): Promise<string | null> {
  return await invoke<string | null>('reveal_api_key', { providerId });
}
