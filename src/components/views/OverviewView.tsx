'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Cpu, 
  Coins, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Zap, 
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { TabType } from '../Sidebar';

interface OverviewViewProps {
  onNavigateTab: (tab: TabType) => void;
}

export function OverviewView({ onNavigateTab }: OverviewViewProps) {
  const [usageData, setUsageData] = useState<any>(null);
  const [providerData, setProviderData] = useState<any[]>([]);
  const [keysData, setKeysData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uRes, pRes, kRes] = await Promise.all([
        fetch('/api/usage'),
        fetch('/api/providers'),
        fetch('/api/keys'),
      ]);

      const [uJson, pJson, kJson] = await Promise.all([
        uRes.json(),
        pRes.json(),
        kRes.json(),
      ]);

      if (uJson.success) setUsageData(uJson);
      if (pJson.success) setProviderData(pJson.providers);
      if (kJson.success) setKeysData(kJson.keys);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = usageData?.summary || {
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    avgLatencyMs: 0,
    providerCounts: {},
    statusCounts: { SUCCESS: 0, FALLBACK: 0, ERROR: 0 },
  };

  const activeKeysCount = keysData.filter((k) => k.status === 'ACTIVE').length;
  const cooldownKeysCount = keysData.filter((k) => k.status === 'RATE_LIMITED').length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            AI Gateway Overview
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Monitoring kinerja AI Gateway, distribusi token, status API key, dan failover antar provider.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#212738] hover:bg-[#1a2030] text-xs font-medium text-zinc-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total Requests</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">{summary.totalRequests}</span>
            <span className="text-xs text-zinc-500 ml-2">panggilan gateway</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">
              {summary.statusCounts.SUCCESS} sukses
            </span>
            <span>•</span>
            <span className="text-amber-400 font-medium">
              {summary.statusCounts.FALLBACK} fallback
            </span>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total Tokens</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {summary.totalTokens.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-2">
            <span>In: {summary.promptTokens.toLocaleString()}</span>
            <span>•</span>
            <span>Out: {summary.completionTokens.toLocaleString()}</span>
          </div>
        </div>

        {/* Average Latency */}
        <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Avg Latency</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {summary.avgLatencyMs}
            </span>
            <span className="text-xs text-zinc-500 ml-1">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium">
            Response time optimal
          </div>
        </div>

        {/* Key Health */}
        <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">API Key Health</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white font-mono">
              {activeKeysCount} / {keysData.length}
            </span>
            <span className="text-xs text-zinc-500 ml-2">aktif</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {cooldownKeysCount > 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {cooldownKeysCount} dalam cooldown
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Semua key siap digunakan
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Provider Matrix Status */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Status AI Providers</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Urutan prioritas gateway dan ketersediaan API key pada masing-masing provider.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('providers')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            Kelola Provider <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {providerData.map((p) => {
            const reqCount = summary.providerCounts[p.id] || 0;
            return (
              <div
                key={p.id}
                className="bg-[#141722] border border-[#1e2332] rounded-lg p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white capitalize">{p.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        p.hasAvailableKeys && p.isEnabled ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1c2130] flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-mono">
                    {p.activeKeys} Active Key{p.activeKeys !== 1 ? 's' : ''}
                  </span>
                  <span className="text-indigo-400 font-medium font-mono">
                    {reqCount} calls
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Log Preview */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Riwayat Gateway Terakhir</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pencatatan real-time audit trail untuk setiap pesan yang diproses.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('usage')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            Lihat Semua Log <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1b202e] text-zinc-500 font-medium pb-2">
                <th className="py-2.5">Waktu</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Key Digunakan</th>
                <th>Status</th>
                <th>Tokens</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171a26]">
              {usageData?.recentLogs?.slice(0, 5).map((log: any) => (
                <tr key={log.id} className="hover:bg-[#131622] text-zinc-300">
                  <td className="py-2.5 font-mono text-[11px] text-zinc-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="capitalize font-medium text-white">{log.provider}</td>
                  <td className="font-mono text-zinc-400">{log.model}</td>
                  <td className="text-zinc-400">{log.keyLabel}</td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : log.status === 'FALLBACK'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="font-mono text-zinc-400">{log.totalTokens}</td>
                  <td className="font-mono text-zinc-400">{log.latencyMs} ms</td>
                </tr>
              ))}
              {(!usageData?.recentLogs || usageData.recentLogs.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-zinc-500">
                    Belum ada riwayat aktivitas. Coba kirim pesan di tab AI Chat!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

