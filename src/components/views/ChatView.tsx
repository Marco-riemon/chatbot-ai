'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Plus, 
  Trash2, 
  Bot, 
  User, 
  Zap, 
  AlertTriangle, 
  Clock, 
  Coins, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp,
  Cpu,
  Star,
  Wrench,
  Compass,
  Check,
  FolderOpen,
  FileEdit,
  FilePlus,
  FileX,
  XCircle,
  CheckCheck
} from 'lucide-react';
import { Conversation, ChatMessage, ProviderId, ModelInfo, FailoverStep, UserIntent, FileOperationProposal } from '@/lib/types';

interface ChatViewProps {
  models: ModelInfo[];
  defaultProvider?: ProviderId;
}

export function ChatView({ models, defaultProvider = 'groq' }: ChatViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderId | 'auto'>('auto');
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [expandedTrailMsgId, setExpandedTrailMsgId] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Rate response modal
  const [evaluatingMessage, setEvaluatingMessage] = useState<ChatMessage | null>(null);
  const [evalAccuracy, setEvalAccuracy] = useState<number>(5);
  const [evalRelevance, setEvalRelevance] = useState<number>(5);
  const [evalNaturalness, setEvalNaturalness] = useState<number>(5);
  const [evalContext, setEvalContext] = useState<number>(5);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);

  // Proposal execution state: { [proposalId]: { state, result? } }
  const [proposalStatuses, setProposalStatuses] = useState<Record<string, { state: string; result?: string }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success && data.conversations) {
        setConversations(data.conversations);
        if (!activeConvId && data.conversations.length > 0) {
          setActiveConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Percakapan Baru',
          provider: selectedProvider === 'auto' ? 'groq' : selectedProvider,
          model: selectedModel === 'auto' ? 'openai/gpt-oss-20b' : selectedModel,
        }),
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        setMessages([]);
        setGatewayError(null);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    setGatewayError(null);
    let convId = activeConvId;

    if (!convId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: text.slice(0, 32),
            provider: selectedProvider === 'auto' ? 'groq' : selectedProvider,
            model: selectedModel === 'auto' ? 'openai/gpt-oss-20b' : selectedModel,
          }),
        });
        const data = await res.json();
        if (data.success && data.conversation) {
          convId = data.conversation.id;
          setConversations((prev) => [data.conversation, ...prev]);
          setActiveConvId(convId);
        }
      } catch (err) {
        console.error('Could not auto-create conversation:', err);
      }
    }

    const optimisticUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: convId || 'default',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const chatPayload = [...messages, optimisticUserMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          messages: chatPayload,
          providerPreference: selectedProvider === 'auto' ? undefined : selectedProvider,
          modelPreference: selectedModel === 'auto' ? undefined : selectedModel,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        const errorText = result.error || 'Terjadi kesalahan pada AI Gateway';
        setGatewayError(errorText);

        const errorMsg: ChatMessage = {
          id: `err_${Date.now()}`,
          conversationId: convId || 'default',
          role: 'assistant',
          content: `⚠️ **Gateway Error**: ${errorText}`,
          createdAt: new Date().toISOString(),
          failoverTrail: result.failoverTrail || [],
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const aiResp = result.data;
        const assistantMsg: ChatMessage = {
          id: `resp_${Date.now()}`,
          conversationId: convId || 'default',
          role: 'assistant',
          content: aiResp.content,
          provider: aiResp.provider,
          model: aiResp.model,
          intent: aiResp.intent,
          toolsUsed: aiResp.toolsUsed,
          tokens: aiResp.usage,
          failoverTrail: aiResp.failoverTrail,
          proposals: aiResp.proposals,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        fetchConversations();
      }
    } catch (err: any) {
      setGatewayError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluatingMessage) return;
    setIsSubmittingEval(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: evaluatingMessage.conversationId,
          messageId: evaluatingMessage.id,
          provider: evaluatingMessage.provider,
          model: evaluatingMessage.model,
          scores: {
            accuracy: evalAccuracy,
            relevance: evalRelevance,
            naturalness: evalNaturalness,
            contextAwareness: evalContext,
          },
          feedback: evalFeedback,
        }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        // Update local message evaluation
        setMessages((prev) =>
          prev.map((m) =>
            m.id === evaluatingMessage.id ? { ...m, evaluation: data.evaluation } : m
          )
        );
        setEvaluatingMessage(null);
        setEvalFeedback('');
      }
    } catch (err) {
      console.error('Failed to submit evaluation:', err);
    } finally {
      setIsSubmittingEval(false);
    }
  };

  const handleProposalDecision = async (proposalId: string, decision: 'approve' | 'reject') => {
    setProposalStatuses((prev) => ({ ...prev, [proposalId]: { state: 'executing' } }));
    try {
      const res = await fetch('/api/workspace/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        const resultMsg = decision === 'approve'
          ? (data.result || 'Berhasil dieksekusi.')
          : 'Ditolak oleh pengguna.';
        setProposalStatuses((prev) => ({
          ...prev,
          [proposalId]: { state: decision === 'approve' ? 'approved' : 'rejected', result: resultMsg },
        }));
      } else {
        setProposalStatuses((prev) => ({
          ...prev,
          [proposalId]: { state: 'error', result: data.error || 'Gagal mengeksekusi.' },
        }));
      }
    } catch (err: any) {
      setProposalStatuses((prev) => ({
        ...prev,
        [proposalId]: { state: 'error', result: err.message || 'Network error' },
      }));
    }
  };

  const getProposalActionIcon = (action: string) => {
    if (action === 'create') return <FilePlus className="w-3.5 h-3.5 text-emerald-400" />;
    if (action === 'edit') return <FileEdit className="w-3.5 h-3.5 text-amber-400" />;
    if (action === 'delete') return <FileX className="w-3.5 h-3.5 text-rose-400" />;
    return <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />;
  };

  const getIntentBadge = (intent?: UserIntent) => {
    if (!intent) return null;
    const map: Record<UserIntent, { label: string; color: string }> = {
      technical_coding: { label: '🎯 Technical Coding', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      calculation: { label: '⚡ Calculation', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      current_info: { label: '🔍 Current Info', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      troubleshooting: { label: '🛠️ Troubleshooting', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
      recommendation: { label: '⚖️ Recommendation', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      explanation: { label: '💡 Explanation', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
      follow_up: { label: '🔄 Follow-up', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
      creative: { label: '🎨 Creative', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
      general_question: { label: '💬 General', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    };
    const item = map[intent] || map.general_question;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.color}`}>
        {item.label}
      </span>
    );
  };

  const availableModels = selectedProvider === 'auto' 
    ? models 
    : models.filter((m) => m.provider === selectedProvider);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#090a0f]">
      {/* Left Column: Conversations List */}
      <div className="w-64 border-r border-[#1a1e2b] bg-[#0c0e15] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#1a1e2b]">
          <button
            onClick={handleCreateNewConversation}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Percakapan Baru</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs px-3">
              Belum ada riwayat percakapan. Mulai obrolan baru di sebelah kanan!
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#181c29] text-zinc-100 font-medium border border-indigo-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121520]'
                  }`}
                >
                  <div className="truncate pr-5">
                    <p className="truncate">{conv.title}</p>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <span className="capitalize">{conv.provider}</span> • {conv.messageCount} pesan
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition-opacity"
                    title="Hapus percakapan"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Chat Bar: Provider & Model Selectors */}
        <div className="h-14 border-b border-[#1a1e2b] bg-[#0c0e15] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Provider Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 font-medium">Provider:</span>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                className="bg-[#151824] border border-[#23293a] text-zinc-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="auto">✨ Auto Gateway (Auto Fallback)</option>
                <option value="groq">Groq (Ultra-Fast)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="cloudflare">Cloudflare Workers AI</option>
                <option value="nvidia">NVIDIA NIM</option>
              </select>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 font-medium">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#151824] border border-[#23293a] text-zinc-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 max-w-[220px] truncate"
              >
                <option value="auto">🎯 Auto Router (Intent-Based)</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} [{m.category}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Failover & RAG Active
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="text-base font-semibold text-zinc-100">AI Assistant — Quality Blueprint Active</h2>
              <p className="text-xs text-zinc-400 mt-1 mb-6 leading-relaxed">
                Dilengkapi dengan Intent Detection cerdas, Sliding Window Context Manager, Tool Calling (Kalkulator & RAG Dokumen), dan Anti-Hallucination Guardrails.
              </p>

              {/* Starter chips */}
              <div className="w-full grid grid-cols-1 gap-2 text-left">
                <button
                  onClick={() => handleSendMessage('Bagaimana cara kerja automatic failover pada AI Gateway ini menurut blueprint?')}
                  className="p-3 rounded-lg bg-[#121522] border border-[#1f2638] hover:border-indigo-500/50 hover:bg-[#161a2b] transition-all text-xs text-zinc-300"
                >
                  📚 <span className="font-medium text-white">RAG Knowledge Retrieval:</span> Bagaimana alur failover pada blueprint project ini?
                </button>
                <button
                  onClick={() => handleSendMessage('Berapa hasil perhitungan dari 125 * 384 + 1928 / 4?')}
                  className="p-3 rounded-lg bg-[#121522] border border-[#1f2638] hover:border-indigo-500/50 hover:bg-[#161a2b] transition-all text-xs text-zinc-300"
                >
                  ⚡ <span className="font-medium text-white">Calculator Tool:</span> Hitung 125 * 384 + 1928 / 4 tanpa kesalahan aritmatika
                </button>
                <button
                  onClick={() => handleSendMessage('Buatkan fungsi Python untuk exponential backoff retry dengan jitter.')}
                  className="p-3 rounded-lg bg-[#121522] border border-[#1f2638] hover:border-indigo-500/50 hover:bg-[#161a2b] transition-all text-xs text-zinc-300"
                >
                  💻 <span className="font-medium text-white">Technical Reasoning:</span> Kode Python untuk retry dengan exponential backoff
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              const hasFailover = msg.failoverTrail && msg.failoverTrail.length > 1;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 max-w-4xl mx-auto ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs ${
                      isAssistant
                        ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20'
                        : 'bg-zinc-700'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Bubble & Metadata */}
                  <div className={`space-y-1.5 max-w-[85%] ${isAssistant ? '' : 'items-end'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-[#121520] border border-[#1d2232] text-zinc-200'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {isAssistant ? (
                        <div className="prose prose-invert prose-sm max-w-none break-words">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Assistant Metadata (Provider, Intent, Tools, Tokens, Rate button) */}
                    {isAssistant && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400 pl-1">
                        {getIntentBadge(msg.intent)}

                        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                            <Wrench className="w-3 h-3" />
                            {msg.toolsUsed.map((t) => t.toolName).join(', ')}
                          </span>
                        )}

                        {msg.provider && (
                          <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-mono border border-zinc-700/50">
                            {msg.provider} • {msg.model}
                          </span>
                        )}

                        {msg.tokens && (
                          <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-zinc-500" />
                            {msg.tokens.totalTokens} tokens
                          </span>
                        )}

                        {/* Failover status dropdown */}
                        {hasFailover && (
                          <button
                            onClick={() =>
                              setExpandedTrailMsgId(expandedTrailMsgId === msg.id ? null : msg.id)
                            }
                            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Fallback dipicu ({msg.failoverTrail!.length} langkah)
                            {expandedTrailMsgId === msg.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        {/* Quality Rating Button / Badge */}
                        {msg.evaluation ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-medium">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {((msg.evaluation.scores.accuracy + msg.evaluation.scores.relevance + msg.evaluation.scores.naturalness + msg.evaluation.scores.contextAwareness) / 4).toFixed(1)} / 5.0
                          </span>
                        ) : (
                          <button
                            onClick={() => setEvaluatingMessage(msg)}
                            className="inline-flex items-center gap-1 text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 px-1.5 py-0.5 rounded transition-colors"
                            title="Beri penilaian kualitas respon"
                          >
                            <Star className="w-3 h-3" />
                            <span>Beri Rating</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Collapsible failover steps audit */}
                    {hasFailover && expandedTrailMsgId === msg.id && (
                      <div className="mt-2 p-3 rounded-lg bg-[#141824] border border-amber-500/30 text-xs text-zinc-300 space-y-1.5">
                        <p className="font-semibold text-amber-400 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Alur Automatic Failover:
                        </p>
                        {msg.failoverTrail!.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-[11px] font-mono border-l-2 pl-2 border-zinc-700"
                          >
                            <span
                              className={`shrink-0 font-bold ${
                                step.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              [{step.status}]
                            </span>
                            <div>
                              <span className="capitalize text-zinc-200">{step.provider}</span> (
                              {step.keyLabel}) - Model: {step.model}
                              {step.errorMessage && (
                                <p className="text-zinc-400 text-[10px] mt-0.5">{step.errorMessage}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filesystem Proposal Confirmation Cards */}
                  {isAssistant && msg.proposals && msg.proposals.length > 0 && (
                    <div className="max-w-4xl mx-auto w-full pl-11 space-y-2 mt-1">
                      {msg.proposals.map((proposal: FileOperationProposal) => {
                        const ps = proposalStatuses[proposal.id];
                        const isDone = ps && (ps.state === 'approved' || ps.state === 'rejected' || ps.state === 'error');
                        const isExec = ps && ps.state === 'executing';

                        return (
                          <div
                            key={proposal.id}
                            className={`rounded-lg border p-3 text-xs space-y-2 ${
                              ps?.state === 'approved'
                                ? 'bg-emerald-500/5 border-emerald-500/30'
                                : ps?.state === 'rejected'
                                ? 'bg-zinc-800/50 border-zinc-700/50'
                                : ps?.state === 'error'
                                ? 'bg-rose-500/5 border-rose-500/30'
                                : 'bg-[#131a2a] border-indigo-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {getProposalActionIcon(proposal.action)}
                              <span className="font-semibold text-zinc-200">
                                Proposal Filesystem — {proposal.action === 'create' ? 'Buat File' : proposal.action === 'edit' ? 'Edit File' : proposal.action === 'delete' ? 'Hapus File' : 'Operasi File'}
                              </span>
                              {isDone && (
                                <span className={`ml-auto px-1.5 py-0.5 rounded font-mono ${
                                  ps?.state === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                  ps?.state === 'rejected' ? 'bg-zinc-700 text-zinc-400' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {ps?.state === 'approved' ? '✓ Disetujui' : ps?.state === 'rejected' ? '✕ Ditolak' : '⚠ Error'}
                                </span>
                              )}
                            </div>

                            <div className="font-mono text-zinc-400 bg-black/30 rounded px-2.5 py-1.5 break-all">
                              {proposal.filePath}
                            </div>

                            {proposal.action !== 'delete' && proposal.content && !isDone && (
                              <details className="text-zinc-500">
                                <summary className="cursor-pointer hover:text-zinc-300 select-none">Lihat konten yang akan ditulis…</summary>
                                <pre className="mt-1.5 text-[10px] bg-black/40 rounded p-2 overflow-x-auto max-h-32 text-zinc-400 whitespace-pre-wrap">
                                  {proposal.content.slice(0, 500)}{proposal.content.length > 500 ? '\n…(dipotong)' : ''}
                                </pre>
                              </details>
                            )}

                            {isDone && ps?.result && (
                              <p className={`text-[11px] leading-relaxed ${
                                ps.state === 'approved' ? 'text-emerald-400' :
                                ps.state === 'error' ? 'text-rose-400' : 'text-zinc-500'
                              }`}>
                                {ps.result}
                              </p>
                            )}

                            {!isDone && (
                              <div className="flex gap-2 pt-0.5">
                                <button
                                  onClick={() => handleProposalDecision(proposal.id, 'approve')}
                                  disabled={isExec}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-colors"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  {isExec ? 'Mengeksekusi…' : 'Setujui & Jalankan'}
                                </button>
                                <button
                                  onClick={() => handleProposalDecision(proposal.id, 'reject')}
                                  disabled={isExec}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-300 font-medium transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex gap-3.5 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shrink-0 text-white animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#121520] border border-[#1d2232] rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-zinc-400">
                <Zap className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                <span>Mendeteksi intent & memeriksa knowledge retrieval/tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#1a1e2b] bg-[#0c0e15]">
          <div className="max-w-4xl mx-auto relative bg-[#131622] border border-[#202638] rounded-xl focus-within:border-indigo-500 transition-colors shadow-lg">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan ke AI Gateway... (Tekan Enter untuk kirim, Shift+Enter untuk baris baru)"
              rows={2}
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 px-4 py-3 resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-[#1a1e2c]">
              <span className="text-[11px] text-zinc-500">
                Intent router & anti-hallucination tools aktif secara otomatis
              </span>
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputValue.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-medium transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Modal Dialog */}
      {evaluatingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0f121a] border border-[#212738] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Penilaian Kualitas Respons
              </h3>
              <button
                onClick={() => setEvaluatingMessage(null)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="flex items-center justify-between text-zinc-400 font-medium mb-1">
                  <span>Accuracy (Kebenaran Fakta & Bebas Halusinasi)</span>
                  <span className="text-white font-mono">{evalAccuracy} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={evalAccuracy}
                  onChange={(e) => setEvalAccuracy(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-zinc-400 font-medium mb-1">
                  <span>Relevance (Kesesuaian Jawaban dengan Pertanyaan)</span>
                  <span className="text-white font-mono">{evalRelevance} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={evalRelevance}
                  onChange={(e) => setEvalRelevance(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-zinc-400 font-medium mb-1">
                  <span>Naturalness (Keluwesan Bahasa & Tidak Kaku)</span>
                  <span className="text-white font-mono">{evalNaturalness} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={evalNaturalness}
                  onChange={(e) => setEvalNaturalness(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-zinc-400 font-medium mb-1">
                  <span>Context Awareness (Pemahaman Konteks Percakapan)</span>
                  <span className="text-white font-mono">{evalContext} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={evalContext}
                  onChange={(e) => setEvalContext(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jawaban sangat jelas dan to the point."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 resize-none placeholder-zinc-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEvaluatingMessage(null)}
                className="px-3 py-2 rounded-lg bg-[#181d2a] hover:bg-[#202738] text-zinc-300 font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitEvaluation}
                disabled={isSubmittingEval}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                {isSubmittingEval ? 'Menyimpan...' : 'Kirim Penilaian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
