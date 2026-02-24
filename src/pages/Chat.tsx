import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { useProjectStore } from '../stores';
import { askProvider } from '../services/tauriService';
import { AGENT_CONFIGS } from '../types/agent';

type ChatRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  id: string;
  role: ChatRole;
  providerId?: string;
  content: string;
  createdAt: Date;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

const makeId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function Chat() {
  const { currentProjectName, currentProject } = useProjectStore();

  const providers = useMemo(() => Object.keys(AGENT_CONFIGS), []);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['codex', 'claude']);

  const parseMentions = (text: string): string[] => {
    const hits = new Set<string>();
    providers.forEach((pid) => {
      const re = new RegExp(`(^|\\s)@${pid}(\\s|$)`, 'i');
      if (re.test(text)) {
        hits.add(pid);
      }
    });
    return [...hits];
  };
  const [aggregator, setAggregator] = useState<string>('claude');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: makeId(),
      role: 'system',
      content: `Chat (V1) - Project: ${currentProjectName ?? 'Unknown'}. Select providers, ask, and we will add real API calls + audit next.`,
      createdAt: new Date(),
    },
  ]);

  const toggleProvider = (id: string) => {
    setSelectedProviders((current) => {
      const has = current.includes(id);
      const next = has ? current.filter((x) => x !== id) : [...current, id];
      return next.length === 0 ? current : next;
    });
  };

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;

    const mentioned = parseMentions(text);
    const effectiveProviders = mentioned.length > 0 ? mentioned : selectedProviders;

    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: text, createdAt: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput('');

    const now = new Date();

    const providerResults = await Promise.all(
      effectiveProviders.map(async (pid) => {
        const startedAt = Date.now();
        const output = await askProvider(pid, text, currentProject ?? undefined);
        const durationMs = Date.now() - startedAt;

        if (output == null) {
          return {
            pid,
            content: `(${pid}) failed (no output). Duration: ${durationMs}ms`,
          };
        }

        return {
          pid,
          content: output.trim() || `(${pid}) empty output. Duration: ${durationMs}ms`,
        };
      })
    );

    const providerReplies: ChatMessage[] = providerResults.map((r) => ({
      id: makeId(),
      role: 'assistant',
      providerId: r.pid,
      content: r.content,
      createdAt: now,
    }));

    const overrideNote: ChatMessage | null = mentioned.length > 0
      ? {
          id: makeId(),
          role: 'system',
          content: `Detected mentions: ${mentioned.map((m) => `@${m}`).join(' ')} (overriding selection)`,
          createdAt: now,
        }
      : null;

    const aggInput = [
      `User question:\n${text}`,
      '',
      'Provider replies:',
      ...providerResults.map((r) => `- ${r.pid}:\n${r.content}`),
      '',
      'Task: Summarize the best answer and highlight disagreements. Keep it concise.',
    ].join('\n');

    const aggStartedAt = Date.now();
    const aggOut = await askProvider(aggregator, aggInput, currentProject ?? undefined);
    const aggDurationMs = Date.now() - aggStartedAt;

    const aggMsg: ChatMessage = {
      id: makeId(),
      role: 'assistant',
      providerId: aggregator,
      content: (aggOut?.trim() || '(aggregator) failed / empty output.') + `\n\n(duration: ${aggDurationMs}ms)` ,
      createdAt: new Date(),
    };

    setMessages((m) => [...m, ...providerReplies, ...(overrideNote ? [overrideNote] : []), aggMsg]);
  };

  return (
    <motion.div className="page-shell" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      <div className="page-container">
        <motion.div variants={itemVariants} className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-3">
              对话
              <span className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
                <Sparkles className="w-4 h-4" />
                多 AI 并发 + 汇总 (scaffold)
              </span>
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              当前项目: <span className="text-text-primary font-medium">{currentProjectName ?? '未命名'}</span>
            </p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card p-5 rounded-xl mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary mb-3">
            <Users className="w-4 h-4" />
            Providers
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.map((pid) => {
              const cfg = AGENT_CONFIGS[pid];
              const active = selectedProviders.includes(pid);
              return (
                <button
                  key={pid}
                  onClick={() => toggleProvider(pid)}
                  className={clsx(
                    'px-3 py-2 rounded-lg border text-sm min-h-[40px] transition-colors',
                    active
                      ? 'bg-accent-muted border-accent/30 text-text-primary'
                      : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default'
                  )}
                  title={cfg.displayName}
                >
                  <span className="mr-2">{cfg.avatar}</span>
                  {cfg.name}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-text-tertiary">汇总器</span>
              <select
                value={aggregator}
                onChange={(e) => setAggregator(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border-subtle bg-bg-surface text-sm min-h-[40px]"
              >
                {providers.map((pid) => (
                  <option key={pid} value={pid}>
                    {AGENT_CONFIGS[pid].name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card rounded-xl overflow-hidden flex flex-col h-[calc(100vh-320px)]">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const bubbleClass = isUser
                ? 'bg-accent text-white ml-auto'
                : msg.role === 'system'
                  ? 'bg-bg-secondary/60 text-text-secondary'
                  : 'bg-bg-surface text-text-primary';

              return (
                <div key={msg.id} className={clsx('max-w-[900px] w-fit', isUser ? 'ml-auto' : 'mr-auto')}>
                  {msg.role === 'assistant' && msg.providerId && (
                    <div className="text-xs text-text-tertiary mb-1">
                      {AGENT_CONFIGS[msg.providerId]?.avatar} {AGENT_CONFIGS[msg.providerId]?.name}
                    </div>
                  )}
                  <div className={clsx('rounded-2xl px-4 py-3 border border-border-subtle', bubbleClass)}>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border-subtle p-3 bg-bg-surface">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息，支持 @codex @claude (V1: 先做 UI 入口，后接 API + 审计)"
                className="flex-1 resize-none rounded-xl border border-border-subtle bg-bg-primary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 min-h-[48px] max-h-[140px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
              />
              <button
                onClick={() => void onSend()}
                className="btn-primary rounded-xl px-4 min-w-[52px] flex items-center justify-center"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
