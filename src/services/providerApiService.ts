import { invoke } from '@tauri-apps/api/core';

export type ProviderChatRole = 'user' | 'assistant' | 'system';

export type ProviderChatMessage = {
  role: ProviderChatRole;
  content: string;
};

export type ProviderChatRequest = {
  provider_id: string;
  model: string;
  messages: ProviderChatMessage[];
  max_tokens?: number;
};

export type ProviderChatResponse = {
  content: string;
};

export async function providerChat(req: ProviderChatRequest): Promise<ProviderChatResponse> {
  return await invoke<ProviderChatResponse>('provider_chat', { req });
}
