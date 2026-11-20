'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Activity, 
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { ModelInfo, ProviderId } from '@/lib/types';

interface ProvidersViewProps {
  models: ModelInfo[];
  onRefreshModels: () => void;
}

export function ProvidersView({ models, onRefreshModels }: ProvidersViewProps) {
  const [providers, setProviders] = useState<any[]>([]);
  const [pingResults, setPingResults] = useState<Record<string, { healthy: boolean; latencyMs?: number; error?: string; loading?: boolean }>>({});
  const [modelSearch, setModelSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (data.success) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleToggleProvider = async (providerId: string, currentEnabled: boolean) => {
    try {
      await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, enabled: !currentEnabled }),
      });
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, isEnabled: !currentEnabled } : p))
      );
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    }
  };

  const handleTestPing = async (providerId: string) => {
    setPingResults((prev) => ({
      ...prev,
      [providerId]: { healthy: false, loading: true },
    }));

    try {
      const res = await fetch(`/api/health?provider=${providerId}`);
      const data = await res.json();
      setPingResults((prev) => ({
        ...prev,
        [providerId]: {
          healthy: data.healthy,
          latencyMs: data.latencyMs,
          error: data.error,
          loading: false,
        },
      }));
    } catch (err: any) {
      setPingResults((prev) => ({
        ...prev,
        [providerId]: {
          healthy: false,
          error: err.message || 'Connection test failed',
          loading: false,
        },
      }));
    }
  };

  // Filter models
  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.provider.toLowerCase().includes(modelSearch.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'all' || m.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            AI Providers & Model Catalog
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Konfigurasi koneksi ke 5 AI provider, tes latensi respon, dan kelola model katalog terintegrasi.
          </p>
        </div>
        <button
          onClick={() => {
            fetchProviders();
            onRefreshModels();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#212738] hover:bg-[#1a2030] text-xs font-medium text-zinc-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p) => {
          const ping = pingResults[p.id];
          return (
            <div
              key={p.id}
              className={`bg-[#0f121a] border rounded-xl p-5 flex flex-col justify-between transition-all ${
                p.isEnabled ? 'border-[#1b202e]' : 'border-[#1b202e]/40 opacity-70'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white capitalize">{p.name}</h3>
                      <span className="text-[10px] text-zinc-500 font-mono">Priority #{p.priorityOrder}</span>
                    </div>
                  </div>

                  {/* Enable / Disable toggle */}
                  <button
                    onClick={() => handleToggleProvider(p.id, p.isEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      p.isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        p.isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">{p.description}</p>

                {/* Key Status Pill */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Kunci API:</span>
                  {p.hasAvailableKeys ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> {p.activeKeys} Key Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      Belum ada API key
                    </span>
                  )}
                </div>

                {/* Ping Result if tested */}
                {ping && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[#141724] border border-[#212738] text-xs">
                    {ping.loading ? (
                      <span className="text-indigo-400 flex items-center gap-1.5 animate-pulse text-[11px]">
                        <Activity className="w-3.5 h-3.5 animate-spin" /> Sedang mengetes koneksi...
                      </span>
                    ) : ping.healthy ? (
                      <div className="text-emerald-400 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
                        </span>
                        <span className="font-mono">{ping.latencyMs} ms</span>
                      </div>
                    ) : (
                      <div className="text-red-400 text-[11px]">
                        <div className="flex items-center gap-1 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Gagal terhubung
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-0.5 truncate">{ping.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-[#1a1f2d] flex items-center justify-between">
                <a
                  href={p.consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  <span>Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  onClick={() => handleTestPing(p.id)}
                  disabled={ping?.loading || !p.hasAvailableKeys}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181d2a] hover:bg-[#202738] disabled:opacity-40 text-xs text-zinc-300 font-medium transition-colors"
                >
                  <Activity className="w-3 h-3 text-indigo-400" />
                  <span>Test Ping</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Catalog Section */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Daftar Model AI Terintegrasi</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Model yang diklasifikasikan berdasarkan kategori kegunaan dan context window.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari model..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="bg-[#141824] border border-[#212738] text-xs text-zinc-200 placeholder-zinc-500 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-[#141824] border border-[#212738] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="Fast Response">Fast Response</option>
              <option value="Reasoning">Reasoning</option>
              <option value="General Purpose">General Purpose</option>
              <option value="Coding">Coding</option>
              <option value="Lightweight">Lightweight</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1b202e] text-zinc-500 font-medium pb-2">
                <th className="py-2.5">Model Name & ID</th>
                <th>Provider</th>
                <th>Kategori</th>
                <th>Context Window</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171a26]">
              {filteredModels.map((m) => (
                <tr key={`${m.provider}_${m.id}`} className="hover:bg-[#131622] text-zinc-300">
                  <td className="py-2.5">
                    <p className="font-medium text-white">{m.name}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{m.id}</p>
                  </td>
                  <td className="capitalize font-mono text-zinc-300">{m.provider}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {m.category}
                    </span>
                  </td>
                  <td className="font-mono text-zinc-400">
                    {m.contextWindow ? `${(m.contextWindow / 1024).toFixed(0)}k tokens` : '-'}
                  </td>
                  <td className="text-zinc-400 text-[11px] max-w-xs truncate">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

