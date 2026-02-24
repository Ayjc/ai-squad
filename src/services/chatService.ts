import { invoke } from '@tauri-apps/api/core';

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
  pinned: boolean;
  project_path: string | null;
};

export type ChatMessageRecord = {
  id: string;
  conversation_id: string;
  role: string;
  provider_id: string | null;
  content_enc: { nonce_b64: string; ct_b64: string };
  created_at: string;
  kind: string | null;
};

export type ChatRunRecord = {
  id: string;
  conversation_id: string;
  question_enc: { nonce_b64: string; ct_b64: string };
  providers_json: string;
  aggregator_provider_id: string;
  created_at: string;
};

export type ChatRunStepRecord = {
  id: number | null;
  run_id: string;
  provider_id: string;
  status: string;
  duration_ms: number | null;
  error_category: string | null;
  error_raw_enc: { nonce_b64: string; ct_b64: string } | null;
  input_enc: { nonce_b64: string; ct_b64: string } | null;
  output_enc: { nonce_b64: string; ct_b64: string } | null;
  started_at: string | null;
  completed_at: string | null;
};

export async function chatCreateConversation(title: string, projectPath?: string): Promise<ConversationSummary> {
  return await invoke<ConversationSummary>('chat_create_conversation', {
    input: {
      title,
      project_path: projectPath ?? null,
    },
  });
}

export async function chatListConversations(projectPath?: string): Promise<ConversationSummary[]> {
  return await invoke<ConversationSummary[]>('chat_list_conversations', {
    projectPath: projectPath ?? null,
  });
}

export async function chatAppendMessage(args: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  providerId?: string;
  content: string;
  kind?: string;
}): Promise<ChatMessageRecord> {
  return await invoke<ChatMessageRecord>('chat_append_message', {
    input: {
      conversation_id: args.conversationId,
      role: args.role,
      provider_id: args.providerId ?? null,
      content: args.content,
      kind: args.kind ?? null,
    },
  });
}

export async function chatListMessages(conversationId: string): Promise<ChatMessageRecord[]> {
  return await invoke<ChatMessageRecord[]>('chat_list_messages', { conversationId });
}

export async function chatCreateRun(args: {
  conversationId: string;
  question: string;
  providers: string[];
  aggregatorProviderId: string;
}): Promise<ChatRunRecord> {
  return await invoke<ChatRunRecord>('chat_create_run', {
    input: {
      conversation_id: args.conversationId,
      question: args.question,
      providers: args.providers,
      aggregator_provider_id: args.aggregatorProviderId,
    },
  });
}

export async function chatLogStep(args: {
  runId: string;
  providerId: string;
  status: string;
  durationMs?: number;
  errorCategory?: string;
  errorRaw?: string;
  input?: string;
  output?: string;
  startedAt?: string;
  completedAt?: string;
}): Promise<ChatRunStepRecord> {
  return await invoke<ChatRunStepRecord>('chat_log_step', {
    input: {
      run_id: args.runId,
      provider_id: args.providerId,
      status: args.status,
      duration_ms: args.durationMs ?? null,
      error_category: args.errorCategory ?? null,
      error_raw: args.errorRaw ?? null,
      input: args.input ?? null,
      output: args.output ?? null,
      started_at: args.startedAt ?? null,
      completed_at: args.completedAt ?? null,
    },
  });
}
