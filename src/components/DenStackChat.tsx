import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Code2,
  DollarSign,
  Gem,
  Plus,
  X,
  Flame,
} from 'lucide-react';
import { searchTools, type Tool } from '@/lib/supabase';
import { generateStackPipeline } from '@/lib/recommendations';
import type { StackRecommendationResult, StackToolRecommendation, PipelineStep } from '@/types/database';

export interface DenStackChatProps {
  onOpenTool?: (slug: string) => void;
  onNavigateToSmelt?: (query: string, stack: string[]) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  techStack?: string[];
  recommendationResult?: StackRecommendationResult;
}

const STARTER_PROMPTS = [
  {
    title: 'Full-stack Next.js SaaS',
    desc: 'Scalable web app with auth, payments & PostgreSQL',
    stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
  },
  {
    title: 'Local Python AI Agent',
    desc: 'Autonomous agent with vector search & fast inference',
    stack: ['Python', 'FastAPI', 'Qdrant', 'PyTorch'],
  },
  {
    title: 'High-Throughput Go Microservice',
    desc: 'Low-latency backend with Redis caching & worker queue',
    stack: ['Go', 'Redis', 'Docker', 'PostgreSQL'],
  },
  {
    title: 'Cross-Platform Mobile App',
    desc: 'React Native app with offline sync & push notifications',
    stack: ['React Native', 'Expo', 'SQLite', 'TypeScript'],
  },
];

const POPULAR_STACK_SUGGESTIONS = [
  'Next.js',
  'React',
  'TypeScript',
  'Python',
  'Go',
  'Rust',
  'PostgreSQL',
  'Redis',
  'Tailwind CSS',
  'Docker',
  'FastAPI',
  'Node.js',
];

export function DenStackChat({ onOpenTool, onNavigateToSmelt }: DenStackChatProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      role: 'assistant',
      content:
        "Welcome to The Den. Tell me about your project idea and preferred tech stack (e.g., Next.js, Python, Go, Postgres). I'll inspect Gronckle's vault of verified developer tools to architect the cleanest, most efficient stack with zero hallucinations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [projectIdea, setProjectIdea] = useState('');
  const [techStackTags, setTechStackTags] = useState<string[]>(['TypeScript', 'PostgreSQL']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('complete');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Preload all tools for recommendation grounding
  useEffect(() => {
    searchTools('', {})
      .then(setTools)
      .catch((err) => console.error('Failed to preload tools for chat:', err));
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleAddTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!techStackTags.includes(trimmed)) {
      setTechStackTags([...techStackTags, trimmed]);
    }
    setCustomTagInput('');
  }

  function handleRemoveTag(tagToRemove: string) {
    setTechStackTags(techStackTags.filter((t) => t !== tagToRemove));
  }

  function handleApplyStarter(starter: (typeof STARTER_PROMPTS)[0]) {
    setProjectIdea(starter.desc);
    setTechStackTags(starter.stack);
  }

  function copyInstall(command: string, id: string) {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = projectIdea.trim();
    if (!query || loading) return;

    const userMsgId = 'user-' + Date.now();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      techStack: [...techStackTags],
    };

    setMessages((prev) => [...prev, userMsg]);
    setProjectIdea('');
    setLoading(true);
    setPipelineStep('understanding');

    try {
      // Build composite query incorporating both idea and stack constraints
      const fullQuery = `${query}${techStackTags.length > 0 ? ` using ${techStackTags.join(', ')}` : ''}`;

      const result = await generateStackPipeline(fullQuery, tools, {
        stack: techStackTags,
        scale: 'hobby',
        preset: 'balanced',
        onStepChange: setPipelineStep,
      });

      const summaryText =
        result.tools.length > 0
          ? `Here is the optimal architecture recommended for your project with ${result.tools.length} verified tools:`
          : `I could not find matching tools in the vault for that criteria.`;

      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: summaryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendationResult: result,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error generating stack in Den chat:', err);
      const errorMsg: ChatMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content:
          "I ran into an issue while searching the tool vault. Please ensure your project description is clear and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setPipelineStep('complete');
    }
  }

  function handleResetChat() {
    setMessages([
      {
        id: 'greeting',
        role: 'assistant',
        content:
          "Chat reset. What's your next project idea and preferred tech stack? I'm ready to architect your tools.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setProjectIdea('');
  }

  return (
    <section className="py-12 border-b border-[#1A1A1A]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 text-[#FF6B2B]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-base font-semibold text-white tracking-wide flex items-center gap-2"
              style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" }}
            >
              <span>The Den — Stack Architect</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Enter your project idea and tech stack — we recommend database-verified tools with zero hallucinations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          className="self-start md:self-auto px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-[#111418] hover:bg-white/5 text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
          title="Start a new chat session"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* ── Chat Container ──────────────────────────────────── */}
      <div className="border border-white/10 rounded-2xl bg-[#0B0D10] overflow-hidden shadow-2xl flex flex-col min-h-[520px] max-h-[850px]">
        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Header */}
              <div className="flex items-center gap-2 mb-1.5 text-[11px] text-white/30 font-mono">
                {msg.role === 'user' ? (
                  <>
                    <span>You</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#FF6B2B] font-semibold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#FF6B2B]" />
                      Gronckle Oracle
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-3xl rounded-2xl p-4 md:p-5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#181D24] border border-white/15 text-white rounded-br-none shadow-md'
                    : 'bg-[#111418] border border-white/10 text-white/90 rounded-bl-none shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* User's Specified Tech Stack Badges */}
                {msg.techStack && msg.techStack.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 mr-1">
                      Target Stack:
                    </span>
                    {msg.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[11px] font-mono border border-white/10"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Assistant's Recommendations Section */}
                {msg.recommendationResult && (
                  <div className="mt-5 space-y-4 pt-4 border-t border-white/10">
                    {/* Summary & Metrics Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-white/60">
                      <div className="flex items-center gap-2">
                        <span className="text-[#FF6B2B]">
                          {msg.recommendationResult.tools.length} Recommended Tools
                        </span>
                        {msg.recommendationResult.estimated_monthly_cost && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {msg.recommendationResult.estimated_monthly_cost}
                            </span>
                          </>
                        )}
                      </div>

                      {onNavigateToSmelt && (
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.recommendationResult) {
                              onNavigateToSmelt(
                                msg.recommendationResult.query,
                                msg.recommendationResult.tools.map((r: StackToolRecommendation) => r.name || r.title)
                              );
                            }
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#FF6B2B]/20 hover:bg-[#FF6B2B]/30 text-[#FF6B2B] hover:text-white border border-[#FF6B2B]/30 text-[11px] font-semibold transition-all flex items-center gap-1"
                        >
                          <span>Smelt in The Smelt</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Compatibility Warnings */}
                    {msg.recommendationResult.warnings && msg.recommendationResult.warnings.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Architectural Warnings</span>
                        </div>
                        {msg.recommendationResult.warnings.map((w, idx) => (
                          <p key={idx} className="text-white/70 pl-5">
                            • <strong className="text-white/90">{w.title}:</strong> {w.description}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Missing Layers Alert */}
                    {msg.recommendationResult.missing_layers &&
                      msg.recommendationResult.missing_layers.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                          <span className="font-semibold text-blue-300">Uncovered Architecture Layers: </span>
                          <span className="text-white/70">
                            {msg.recommendationResult.missing_layers.join(', ')}
                          </span>
                        </div>
                      )}

                    {/* Recommended Tool Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {msg.recommendationResult.tools.map(
                        (rec: StackToolRecommendation, idx: number) => (
                          <div
                            key={rec.id || idx}
                            className="p-3.5 rounded-xl bg-[#0E1115] border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between group"
                          >
                            <div>
                              {/* Header: Role & Category */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono uppercase tracking-wider">
                                  {rec.category}
                                </span>
                                {rec.underrated_score && rec.underrated_score >= 60 && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-[#FF6B2B]/15 text-[#FF6B2B] text-[10px] font-mono flex items-center gap-1 font-semibold"
                                    title={rec.underrated_reason}
                                  >
                                    <Gem className="w-2.5 h-2.5" />
                                    {rec.underrated_score}
                                  </span>
                                )}
                              </div>

                              {/* Title & Detail Link */}
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-white group-hover:text-[#FF6B2B] transition-colors">
                                  {rec.name || rec.title}
                                </h4>
                                {rec.slug && onOpenTool && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenTool(rec.slug!)}
                                    className="text-white/40 hover:text-white transition-colors"
                                    title="View full tool details"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Reasoning */}
                              <p className="text-xs text-white/60 mt-1.5 line-clamp-2 leading-relaxed">
                                {rec.reason}
                              </p>
                            </div>

                            {/* Footer: Install Command & Pricing */}
                            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                              <span className="text-white/40">{rec.pricing || 'Free / OSS'}</span>

                              {rec.install_command ? (
                                <button
                                  type="button"
                                  onClick={() => copyInstall(rec.install_command!, rec.id)}
                                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors flex items-center gap-1"
                                  title="Copy install command"
                                >
                                  {copiedId === rec.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-white/40" />
                                      <span>Install</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-white/20">Web Service</span>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Loading Pipeline State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3"
            >
              <div className="p-2 rounded-xl bg-[#111418] border border-white/10 text-[#FF6B2B] flex items-center justify-center">
                <Sparkles className="w-4 h-4 animate-spin text-[#FF6B2B]" />
              </div>
              <div className="p-4 rounded-2xl bg-[#111418] border border-white/10 text-sm text-white/70 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B2B] animate-ping" />
                  <span>
                    {pipelineStep === 'understanding' && 'Understanding your project & tech stack...'}
                    {pipelineStep === 'retrieving' && 'Retrieving tools from Gronckle vault...'}
                    {pipelineStep === 'ranking' && 'Re-ranking by stack compatibility & costs...'}
                    {pipelineStep === 'explaining' && 'Formulating architectural recommendations...'}
                    {pipelineStep === 'complete' && 'Finalizing stack...'}
                    {pipelineStep === 'idle' && 'Consulting Gronckle Oracle...'}
                  </span>
                </div>
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF6B2B] animate-pulse w-3/4" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Chat Input & Configuration Controls ────────────── */}
        <div className="p-4 border-t border-white/10 bg-[#0E1115]">
          {/* Starter Prompts (if chat has 1 message) */}
          {messages.length === 1 && (
            <div className="mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/40 block mb-2">
                Quick Starters:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {STARTER_PROMPTS.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => handleApplyStarter(starter)}
                    className="p-2.5 rounded-xl bg-[#111418] hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all group"
                  >
                    <div className="font-semibold text-xs text-white group-hover:text-[#FF6B2B] transition-colors">
                      {starter.title}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{starter.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack Pills Area */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-white/40 font-mono flex items-center gap-1 mr-1">
              <Code2 className="w-3.5 h-3.5" />
              <span>Stack:</span>
            </span>

            {techStackTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-xs text-white font-mono"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-400 transition-colors ml-0.5"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Custom Tag Input */}
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(customTagInput);
                  }
                }}
                placeholder="+ Add technology (e.g. Redis, Go)"
                className="bg-transparent border border-dashed border-white/20 hover:border-white/40 focus:border-white/60 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none font-mono"
              />
              {customTagInput.trim() && (
                <button
                  type="button"
                  onClick={() => handleAddTag(customTagInput)}
                  className="p-1 rounded bg-[#FF6B2B]/20 text-[#FF6B2B] hover:bg-[#FF6B2B]/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Suggestions Dropdown/Pills */}
            <div className="hidden lg:flex items-center gap-1 ml-auto text-[11px] text-white/30 font-mono">
              <span>Suggestions:</span>
              {POPULAR_STACK_SUGGESTIONS.slice(0, 4).map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => handleAddTag(tech)}
                  className="hover:text-white underline decoration-white/20"
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Form */}
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <textarea
              rows={2}
              value={projectIdea}
              onChange={(e) => setProjectIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Describe your project idea (e.g., I'm building an AI agent SaaS that generates audio summaries from PDFs with user auth and billing...)"
              className="w-full bg-[#111418] border border-white/10 focus:border-white/30 rounded-xl p-3 pr-28 text-sm text-white placeholder:text-white/30 focus:outline-none resize-none"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={!projectIdea.trim() || loading}
              className="absolute right-2.5 bottom-2.5 px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>{loading ? 'Architecting...' : 'Recommend'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/30 font-mono">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className="text-white/20">Backed by 92+ tools in Gronckle Vault</span>
          </div>
        </div>
      </div>
    </section>
  );
}
