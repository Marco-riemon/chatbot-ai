'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  FileCode, 
  Plus, 
  Star, 
  Activity, 
  ShieldAlert, 
  Check, 
  Trash2,
  Edit,
  Sliders,
  Code2,
  Search,
  BookOpen,
  RotateCcw,
  Tag
} from 'lucide-react';
import { PromptVersion, BenchmarkTestCase, BenchmarkResult, SkillItem } from '@/lib/types';

export function QualityView() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'skills' | 'benchmark'>('skills');

  // Metrics & Prompts
  const [evalSummary, setEvalSummary] = useState<any>(null);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [activePrompt, setActivePrompt] = useState<PromptVersion | null>(null);

  // Benchmark
  const [testCases, setTestCases] = useState<BenchmarkTestCase[]>([]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);

  // Skills Studio
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillSlug, setSkillSlug] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillTags, setSkillTags] = useState('');
  const [skillContent, setSkillContent] = useState('');
  const [isSavingSkill, setIsSavingSkill] = useState(false);

  // Modal create prompt
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptVersion, setNewPromptVersion] = useState('1.1.0');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [evalRes, promptRes, benchRes, skillRes] = await Promise.all([
        fetch('/api/evaluations'),
        fetch('/api/prompts'),
        fetch('/api/benchmark'),
        fetch('/api/skills'),
      ]);

      const [evalData, promptData, benchData, skillData] = await Promise.all([
        evalRes.json(),
        promptRes.json(),
        benchRes.json(),
        skillRes.json(),
      ]);

      if (evalData.success) setEvalSummary(evalData);
      if (promptData.success) {
        setPrompts(promptData.versions || []);
        setActivePrompt(promptData.activePrompt || null);
      }
      if (benchData.success) setTestCases(benchData.testCases || []);
      if (skillData.success) setSkills(skillData.skills || []);
    } catch (err) {
      console.error('Failed to load quality data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Skill Handlers
  const handleToggleSkill = async (id: string, currentEnabled: boolean) => {
    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id, isEnabled: !currentEnabled }),
      });
      setSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isEnabled: !currentEnabled } : s))
      );
    } catch (err) {
      console.error('Failed to toggle skill:', err);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Yakin ingin menghapus skill ini?')) return;
    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleResetSkills = async () => {
    if (!confirm('Reset seluruh skill ke default built-in open-source?')) return;
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success) {
        setSkills(data.skills);
      }
    } catch (err) {
      console.error('Failed to reset skills:', err);
    }
  };

  const handleOpenAddSkill = () => {
    setEditingSkillId(null);
    setSkillName('');
    setSkillSlug('');
    setSkillDesc('');
    setSkillTags('');
    setSkillContent(`# Skill Name\n\nInstructions for the model:\n1. ...\n2. ...`);
    setShowSkillModal(true);
  };

  const handleOpenEditSkill = (skill: SkillItem) => {
    setEditingSkillId(skill.id);
    setSkillName(skill.name);
    setSkillSlug(skill.slug);
    setSkillDesc(skill.description);
    setSkillTags(skill.tags.join(', '));
    setSkillContent(skill.content);
    setShowSkillModal(true);
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim() || !skillContent.trim()) return;

    setIsSavingSkill(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          id: editingSkillId || undefined,
          name: skillName,
          slug: skillSlug,
          description: skillDesc,
          tags: skillTags.split(',').map((t) => t.trim()).filter(Boolean),
          content: skillContent,
          isEnabled: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSkillModal(false);
        loadData();
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
    } finally {
      setIsSavingSkill(false);
    }
  };

  // Prompt Handlers
  const handleActivatePrompt = async (id: string) => {
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', id }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to activate prompt:', err);
    }
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptName.trim() || !newPromptContent.trim()) return;

    setIsSavingPrompt(true);
    try {
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          name: newPromptName,
          version: newPromptVersion,
          description: newPromptDesc,
          systemPrompt: newPromptContent,
        }),
      });
      setShowPromptModal(false);
      setNewPromptName('');
      setNewPromptDesc('');
      setNewPromptContent('');
      loadData();
    } catch (err) {
      console.error('Failed to save prompt:', err);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Benchmark Handlers
  const handleRunSingleBenchmark = async (testCaseId: string) => {
    setRunningCaseId(testCaseId);
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setBenchmarkResults((prev) => {
          const filtered = prev.filter((r) => r.testCaseId !== testCaseId);
          return [...filtered, ...data.results];
        });
      }
    } catch (err) {
      console.error('Benchmark test failed:', err);
    } finally {
      setRunningCaseId(null);
    }
  };

  const handleRunAllBenchmarks = async () => {
    setIsRunningBenchmark(true);
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setBenchmarkResults(data.results);
      }
    } catch (err) {
      console.error('Failed to run all benchmarks:', err);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const summary = evalSummary?.summary || {
    totalEvaluated: 0,
    avgAccuracy: 5.0,
    avgRelevance: 5.0,
    avgNaturalness: 5.0,
    avgContextAwareness: 5.0,
    overallAvg: 5.0,
  };

  const filteredSkills = skills.filter((s) => {
    const q = skillSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" /> Quality Studio, Prompts & Skills
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manajemen skill berkas Markdown, evaluasi kualitas respon 4-dimensi, dan optimasi prompt terstandarisasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab navigation */}
          <div className="flex bg-[#121520] border border-[#212738] rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveTab('skills')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'skills'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Skills Studio ({skills.filter((s) => s.isEnabled).length}/{skills.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'metrics'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Scoreboard & Prompts</span>
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'benchmark'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Benchmark Runner</span>
            </button>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#141824] border border-[#212738] hover:bg-[#1a2030] text-xs font-medium text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SKILLS STUDIO (MARKDOWN)                                           */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari skill berdasarkan nama, deskripsi, atau tag..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full bg-[#141824] border border-[#212738] text-xs text-zinc-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 placeholder-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSkills}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161a26] hover:bg-[#1e2333] border border-[#212738] text-zinc-300 text-xs font-medium transition-colors"
                title="Kembalikan skill ke setelan bawaan open-source"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Default</span>
              </button>
              <button
                onClick={handleOpenAddSkill}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Skill Baru (Markdown)</span>
              </button>
            </div>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={`bg-[#0f121a] border rounded-xl p-5 flex flex-col justify-between transition-all ${
                  skill.isEnabled ? 'border-[#212738]' : 'border-[#1b202e]/40 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{skill.name}</h3>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 mt-0.5 block">slug: {skill.slug}</span>
                    </div>

                    {/* Enable / Disable toggle */}
                    <button
                      onClick={() => handleToggleSkill(skill.id, skill.isEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        skill.isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          skill.isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">
                    {skill.description}
                  </p>

                  {/* Tags */}
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {skill.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#141824] text-zinc-400 border border-[#212738]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Markdown Content Preview */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1 font-mono">
                      <span>Instruksi Markdown:</span>
                      <span>{skill.content.split('\n').length} baris</span>
                    </div>
                    <pre className="text-[11px] font-mono text-zinc-400 bg-[#0c0e15] p-3 rounded-lg border border-[#1b202e] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {skill.content}
                    </pre>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-[#1a1f2d] flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {skill.isBuiltIn ? 'Built-in Open Source' : 'Custom Skill'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditSkill(skill)}
                      className="p-1.5 rounded hover:bg-[#1a2030] text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Edit instruksi skill"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {!skill.isBuiltIn && (
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Hapus skill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCOREBOARD & PROMPT VERSIONS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Quality Scoreboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-medium">Overall Quality</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white font-mono">{summary.overallAvg}</span>
                <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">
                {summary.totalEvaluated} respons dinilai
              </div>
            </div>

            <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
              <span className="text-xs text-zinc-400 font-medium">Accuracy</span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-400 font-mono">{summary.avgAccuracy}</span>
                <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Bebas halusinasi</div>
            </div>

            <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
              <span className="text-xs text-zinc-400 font-medium">Relevance</span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-indigo-400 font-mono">{summary.avgRelevance}</span>
                <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Kesesuaian maksud</div>
            </div>

            <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
              <span className="text-xs text-zinc-400 font-medium">Naturalness</span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-violet-400 font-mono">{summary.avgNaturalness}</span>
                <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Keluwesan bahasa</div>
            </div>

            <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
              <span className="text-xs text-zinc-400 font-medium">Context Awareness</span>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-blue-400 font-mono">{summary.avgContextAwareness}</span>
                <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Memori riwayat</div>
            </div>
          </div>

          {/* System Prompt Management */}
          <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" /> System Prompt Registry & Versioning
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Kelola baseline system prompt terstandarisasi untuk memastikan keseragaman kualitas antar-provider.
                </p>
              </div>
              <button
                onClick={() => setShowPromptModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Versi Prompt Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prompts.map((pv) => {
                const isActive = pv.isActive;
                return (
                  <div
                    key={pv.id}
                    className={`bg-[#141724] border rounded-xl p-5 flex flex-col justify-between transition-all ${
                      isActive ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : 'border-[#212738]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            {pv.name}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              v{pv.version}
                            </span>
                          </h3>
                          <p className="text-xs text-zinc-400 mt-1">{pv.description}</p>
                        </div>

                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> ACTIVE
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivatePrompt(pv.id)}
                            className="px-2.5 py-1 rounded bg-[#1e2333] hover:bg-indigo-600 hover:text-white text-xs font-medium text-zinc-300 transition-colors"
                          >
                            Aktifkan
                          </button>
                        )}
                      </div>

                      <div className="mt-3">
                        <pre className="text-[11px] font-mono text-zinc-400 bg-[#0c0e15] p-3 rounded-lg border border-[#1b202e] max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {pv.systemPrompt}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BENCHMARK RUNNER                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'benchmark' && (
        <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Response Quality Benchmark Dataset
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Evaluasi kepatuhan model terhadap instruksi anti-halusinasi, reasoning, dan pemahaman pertanyaan menggunakan test dataset terstandarisasi.
              </p>
            </div>
            <button
              onClick={handleRunAllBenchmarks}
              disabled={isRunningBenchmark}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition-colors shadow-sm shadow-emerald-600/20"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningBenchmark ? 'animate-spin' : ''}`} />
              <span>{isRunningBenchmark ? 'Menjalankan Pengujian...' : 'Jalankan Semua Pengujian'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {testCases.map((tc) => {
              const latestResult = benchmarkResults.find((r) => r.testCaseId === tc.id);
              const isRunningThis = runningCaseId === tc.id;

              return (
                <div
                  key={tc.id}
                  className="bg-[#141724] border border-[#212738] rounded-xl p-4 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {tc.category}
                        </span>
                        <h4 className="text-xs font-semibold text-white">{tc.name}</h4>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1.5 font-medium">"{tc.prompt}"</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Kriteria Evaluasi: <span className="text-zinc-400">{tc.expectedCriteria}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleRunSingleBenchmark(tc.id)}
                      disabled={isRunningThis || isRunningBenchmark}
                      className="self-start md:self-center shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#222b40] disabled:opacity-40 text-xs font-medium text-zinc-200 transition-colors"
                    >
                      <Play className={`w-3 h-3 text-emerald-400 ${isRunningThis ? 'animate-spin' : ''}`} />
                      <span>{isRunningThis ? 'Menguji...' : 'Uji Kasus Ini'}</span>
                    </button>
                  </div>

                  {latestResult && (
                    <div className="mt-3 pt-3 border-t border-[#1e2436] text-xs">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Respons Model ({latestResult.provider} • {latestResult.model})
                        </span>
                        <span className="font-mono text-zinc-500">
                          {latestResult.latencyMs}ms • {latestResult.tokens} tokens
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0c0e15] border border-[#1c2233] text-zinc-300 text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {latestResult.response}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Add / Edit Skill */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0f121a] border border-[#212738] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                {editingSkillId ? 'Edit Skill Markdown' : 'Tambah Skill Baru (Markdown)'}
              </h3>
              <button
                onClick={() => setShowSkillModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSkill} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Nama Skill</label>
                  <input
                    type="text"
                    placeholder="Contoh: SQL Query Optimizer"
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    required
                    className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Slug Identifier</label>
                  <input
                    type="text"
                    placeholder="sql-optimizer"
                    value={skillSlug}
                    onChange={(e) => setSkillSlug(e.target.value)}
                    className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Deskripsi Singkat</label>
                  <input
                    type="text"
                    placeholder="Optimasi query SQL, indexing, dan analitik performa."
                    value={skillDesc}
                    onChange={(e) => setSkillDesc(e.target.value)}
                    className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Tags (Pisahkan dengan koma)</label>
                  <input
                    type="text"
                    placeholder="sql, database, performance"
                    value={skillTags}
                    onChange={(e) => setSkillTags(e.target.value)}
                    className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Instruksi Skill (Format Markdown / SKILL.md)
                </label>
                <textarea
                  rows={9}
                  placeholder="# Skill: My Custom Skill..."
                  value={skillContent}
                  onChange={(e) => setSkillContent(e.target.value)}
                  required
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Instruksi ini akan disisipkan ke dalam konteks AI Gateway saat skill berstatus aktif.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="px-3 py-2 rounded-lg bg-[#181d2a] hover:bg-[#202738] text-zinc-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSkill || !skillName.trim() || !skillContent.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                >
                  {isSavingSkill ? 'Menyimpan...' : 'Simpan Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Prompt */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0f121a] border border-[#212738] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Buat Versi System Prompt Baru
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Nama Preset</label>
                  <input
                    type="text"
                    placeholder="Contoh: Technical Assistant Pro"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    required
                    className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Versi</label>
                  <input
                    type="text"
                    placeholder="1.1.0"
                    value={newPromptVersion}
                    onChange={(e) => setNewPromptVersion(e.target.value)}
                    className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  placeholder="Instruksi fokus pada akurasi coding dan penjelasan langkah demi langkah."
                  value={newPromptDesc}
                  onChange={(e) => setNewPromptDesc(e.target.value)}
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Isi System Prompt (Instruksi)</label>
                <textarea
                  rows={8}
                  placeholder="You are an intelligent, helpful, and conversational AI assistant..."
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  required
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 font-mono focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="px-3 py-2 rounded-lg bg-[#181d2a] hover:bg-[#202738] text-zinc-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrompt || !newPromptName.trim() || !newPromptContent.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                >
                  {isSavingPrompt ? 'Menyimpan...' : 'Simpan Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
