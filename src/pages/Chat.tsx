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
  kind?: 'normal' | 'summary';
};

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

type RunStep = {
  providerId: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
};

type ChatRun = {
  id: string;
  createdAt: Date;
  question: string;
  providers: string[];
  aggregator: string;
  steps: RunStep[];
  aggregatorStep: RunStep;
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
  const [activeRun, setActiveRun] = useState<ChatRun | null>(null);
  const [showProviderReplies, setShowProviderReplies] = useState(true);
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

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const runCreatedAt = new Date();

    const initialRun: ChatRun = {
      id: runId,
      createdAt: runCreatedAt,
      question: text,
      providers: effectiveProviders,
      aggregator,
      steps: effectiveProviders.map((pid) => ({ providerId: pid, status: 'pending' })),
      aggregatorStep: { providerId: aggregator, status: 'pending' },
    };
    setActiveRun(initialRun);

    const overrideNote: ChatMessage | null = mentioned.length > 0
      ? {
          id: makeId(),
          role: 'system',
          content: `Detected mentions: ${mentioned.map((m) => `@${m}`).join(' ')} (overriding selection)`,
          createdAt: runCreatedAt,
        }
      : null;

    // Execute providers in parallel, updating the run panel as results arrive.
    const providerPromises = effectiveProviders.map(async (pid) => {
      const startedAt = Date.now();
      setActiveRun((r) => {
        if (!r || r.id !== runId) return r;
        return {
          ...r,
          steps: r.steps.map((s) => s.providerId === pid ? { ...s, status: 'running', startedAt } : s),
        };
      });

      const output = await askProvider(pid, text, currentProject ?? undefined);
      const completedAt = Date.now();
      const durationMs = completedAt - startedAt;

      if (output == null) {
        setActiveRun((r) => {
          if (!r || r.id !== runId) return r;
          return {
            ...r,
            steps: r.steps.map((s) => s.providerId === pid
              ? { ...s, status: 'failed', startedAt, completedAt, durationMs, error: 'no output' }
              : s),
          };
        });
        return { pid, content: `(${pid}) failed (no output). Duration: ${durationMs}ms`, durationMs };
      }

      const content = output.trim() || `(${pid}) empty output. Duration: ${durationMs}ms`;
      setActiveRun((r) => {
        if (!r || r.id !== runId) return r;
        return {
          ...r,
          steps: r.steps.map((s) => s.providerId === pid
            ? { ...s, status: 'completed', startedAt, completedAt, durationMs }
            : s),
        };
      });
      return { pid, content, durationMs };
    });

    const providerResults = await Promise.all(providerPromises);

    const providerReplies: ChatMessage[] = providerResults.map((r) => ({
      id: makeId(),
      role: 'assistant',
      providerId: r.pid,
      content: r.content,
      createdAt: new Date(),
      kind: 'normal',
    }));

    const aggInput = [
      `User question:\n${text}`,
      '',
      'Provider replies:',
      ...providerResults.map((r) => `- ${r.pid}:\n${r.content}`),
      '',
      'Task: Summarize the best answer and highlight disagreements. Keep it concise.',
    ].join('\n');

    const aggStartedAt = Date.now();
    setActiveRun((r) => {
      if (!r || r.id !== runId) return r;
      return {
        ...r,
        aggregatorStep: { ...r.aggregatorStep, status: 'running', startedAt: aggStartedAt },
      };
    });

    const aggOut = await askProvider(aggregator, aggInput, currentProject ?? undefined);
    const aggCompletedAt = Date.now();
    const aggDurationMs = aggCompletedAt - aggStartedAt;

    if (aggOut == null) {
      setActiveRun((r) => {
        if (!r || r.id !== runId) return r;
        return {
          ...r,
          aggregatorStep: { ...r.aggregatorStep, status: 'failed', startedAt: aggStartedAt, completedAt: aggCompletedAt, durationMs: aggDurationMs, error: 'no output' },
        };
      });
    } else {
      setActiveRun((r) => {
        if (!r || r.id !== runId) return r;
        return {
          ...r,
          aggregatorStep: { ...r.aggregatorStep, status: 'completed', startedAt: aggStartedAt, completedAt: aggCompletedAt, durationMs: aggDurationMs },
        };
      });
    }

    const aggMsg: ChatMessage = {
      id: makeId(),
      role: 'assistant',
      providerId: aggregator,
      kind: 'summary',
      content: (aggOut?.trim() || '(aggregator) failed / empty output.') + `\n\n(duration: ${aggDurationMs}ms)`,
      createdAt: new Date(),
    };

    setMessages((m) => [...m, ...(overrideNote ? [overrideNote] : []), ...providerReplies, aggMsg]);
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

        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-[calc(100vh-320px)]">
          <div className="card rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle bg-bg-surface">
              <div className="text-sm font-semibold text-text-primary">Messages</div>
              <button
                onClick={() => setShowProviderReplies((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
                title="Toggle provider replies"
              >
                {showProviderReplies ? 'Hide provider replies' : 'Show provider replies'}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages
                .filter((m) => showProviderReplies || m.kind === 'summary' || m.role === 'user' || m.role === 'system')
                .map((msg) => {
                  const isUser = msg.role === 'user';
                  const isSummary = msg.kind === 'summary';

                  const bubbleClass = isUser
                    ? 'bg-accent text-white ml-auto'
                    : msg.role === 'system'
                      ? 'bg-bg-secondary/60 text-text-secondary'
                      : isSummary
                        ? 'bg-gradient-to-br from-accent/18 to-bg-surface text-text-primary border-accent/25'
                        : 'bg-bg-surface text-text-primary';

                  return (
                    <div key={msg.id} className={clsx('max-w-[900px] w-fit', isUser ? 'ml-auto' : 'mr-auto')}>
                      {msg.role === 'assistant' && msg.providerId && (
                        <div className="text-xs text-text-tertiary mb-1 flex items-center gap-2">
                          <span>
                            {AGENT_CONFIGS[msg.providerId]?.avatar} {AGENT_CONFIGS[msg.providerId]?.name}
                          </span>
                          {isSummary && (
                            <span className="px-2 py-0.5 rounded-full border border-accent/25 bg-accent/10 text-accent text-[11px] font-semibold">
                              FINAL SUMMARY
                            </span>
                          )}
                        </div>
                      )}
                      <div className={clsx('rounded-2xl px-4 py-3 border border-border-subtle', bubbleClass)}>
                        <div className={clsx('text-sm whitespace-pre-wrap leading-relaxed', isSummary && 'text-[15px]')}>
                          {msg.content}
                        </div>
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
          </div>

          <div className="card rounded-xl p-4 overflow-auto">
            <div className="text-sm font-semibold text-text-primary mb-3">本次执行</div>
            {!activeRun ? (
              <div className="text-sm text-text-secondary">尚未发送消息</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-text-tertiary mb-2">Providers</div>
                  <div className="space-y-2">
                    {activeRun.steps.map((s) => {
                      const cfg = AGENT_CONFIGS[s.providerId];
                      const dot =
                        s.status === 'running'
                          ? 'bg-warning'
                          : s.status === 'completed'
                            ? 'bg-success'
                            : s.status === 'failed'
                              ? 'bg-error'
                              : 'bg-text-tertiary';
                      return (
                        <div key={s.providerId} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={clsx('w-2 h-2 rounded-full', dot)} />
                            <span className="text-sm text-text-primary truncate">{cfg?.name ?? s.providerId}</span>
                          </div>
                          <div className="text-xs text-text-tertiary tabular-nums">
                            {typeof s.durationMs === 'number' ? `${s.durationMs}ms` : s.status === 'running' ? '...' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-tertiary mb-2">Aggregator</div>
                  {(() => {
                    const s = activeRun.aggregatorStep;
                    const cfg = AGENT_CONFIGS[s.providerId];
                    const dot =
                      s.status === 'running'
                        ? 'bg-warning'
                        : s.status === 'completed'
                          ? 'bg-success'
                          : s.status === 'failed'
                            ? 'bg-error'
                            : 'bg-text-tertiary';
                    return (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={clsx('w-2 h-2 rounded-full', dot)} />
                          <span className="text-sm text-text-primary truncate">{cfg?.name ?? s.providerId}</span>
                        </div>
                        <div className="text-xs text-text-tertiary tabular-nums">
                          {typeof s.durationMs === 'number' ? `${s.durationMs}ms` : s.status === 'running' ? '...' : ''}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <div className="text-xs text-text-tertiary mb-2">Question</div>
                  <div className="text-xs text-text-secondary whitespace-pre-wrap">{activeRun.question}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
