'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Coins, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Filter
} from 'lucide-react';
import { UsageLog } from '@/lib/types';

export function UsageView() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/usage');
      const data = await res.json();
      if (data.success) {
        setLogs(data.recentLogs || []);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Usage & Analytics Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Metrik analitik konsumsi token, log request per provider, latency inference, dan detil audit fallback.
          </p>
        </div>
        <button
          onClick={fetchUsage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#212738] hover:bg-[#1a2030] text-xs font-medium text-zinc-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
            <span className="text-xs text-zinc-400 font-medium">Total Tokens Dikonsumsi</span>
            <p className="text-2xl font-bold text-white font-mono mt-2">
              {summary.totalTokens.toLocaleString()}
            </p>
            <div className="mt-2 text-[11px] text-zinc-500 flex justify-between">
              <span>Prompt: {summary.promptTokens.toLocaleString()}</span>
              <span>Completion: {summary.completionTokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
            <span className="text-xs text-zinc-400 font-medium">Total Gateway Invocations</span>
            <p className="text-2xl font-bold text-white font-mono mt-2">
              {summary.totalRequests}
            </p>
            <p className="mt-2 text-[11px] text-zinc-400">
              Avg Latency: <span className="font-mono text-emerald-400">{summary.avgLatencyMs} ms</span>
            </p>
          </div>

          <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
            <span className="text-xs text-zinc-400 font-medium">Success vs Fallback Rate</span>
            <p className="text-2xl font-bold text-white font-mono mt-2">
              {summary.totalRequests > 0
                ? `${Math.round(
                    ((summary.statusCounts.SUCCESS + summary.statusCounts.FALLBACK) /
                      summary.totalRequests) *
                      100
                  )}%`
                : '100%'}
            </p>
            <p className="mt-2 text-[11px] text-amber-400">
              {summary.statusCounts.FALLBACK} kali fallback berhasil dialihkan
            </p>
          </div>

          <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-5">
            <span className="text-xs text-zinc-400 font-medium">Total Gateway Error</span>
            <p className="text-2xl font-bold text-red-400 font-mono mt-2">
              {summary.statusCounts.ERROR}
            </p>
            <p className="mt-2 text-[11px] text-zinc-400">
              {summary.statusCounts.ERROR === 0 ? 'Semua request tertangani' : 'Tinjau log detail error'}
            </p>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Log Request & Audit Trail</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Riwayat lengkap setiap panggilan chat dengan alur failover yang dilewati.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#141824] border border-[#212738] text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FALLBACK">FALLBACK</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1b202e] text-zinc-500 font-medium pb-2">
                <th className="py-2.5">Waktu</th>
                <th>Provider Final</th>
                <th>Model</th>
                <th>API Key</th>
                <th>Tokens</th>
                <th>Latency</th>
                <th>Status</th>
                <th>Audit Trail / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171a26]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#131622] text-zinc-300">
                  <td className="py-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="capitalize font-semibold text-white">{log.provider}</td>
                  <td className="font-mono text-zinc-400">{log.model}</td>
                  <td className="text-zinc-400">{log.keyLabel}</td>
                  <td className="font-mono text-zinc-300">
                    {log.totalTokens} <span className="text-zinc-500 text-[10px]">({log.promptTokens} in / {log.completionTokens} out)</span>
                  </td>
                  <td className="font-mono text-zinc-400 whitespace-nowrap">{log.latencyMs} ms</td>
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
                  <td className="text-[11px] text-zinc-400 max-w-xs">
                    {log.errorMessage ? (
                      <span className="text-red-400 truncate block">{log.errorMessage}</span>
                    ) : log.failoverTrail && log.failoverTrail.length > 1 ? (
                      <span className="text-amber-400">
                        {log.failoverTrail.length} step fallback dialihkan
                      </span>
                    ) : (
                      <span className="text-zinc-500">Direct hit</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-zinc-500">
                    Tidak ada log request yang cocok dengan filter ini.
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

