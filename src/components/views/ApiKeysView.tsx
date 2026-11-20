'use client';

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2,
  Lock,
  RotateCcw
} from 'lucide-react';
import { ApiKeyRecord, KeyStatus, ProviderId } from '@/lib/types';

export function ApiKeysView() {
  const [keys, setKeys] = useState<Omit<ApiKeyRecord, 'keySecret'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New key form
  const [newProvider, setNewProvider] = useState<ProviderId>('groq');
  const [newLabel, setNewLabel] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to fetch keys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    // Poll key cooldowns every 10 seconds
    const interval = setInterval(fetchKeys, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCooldown = async (keyId: string) => {
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', keyId }),
      });
      fetchKeys();
    } catch (err) {
      console.error('Failed to reset cooldown:', err);
    }
  };

  const handleToggleDisable = async (keyId: string, currentStatus: KeyStatus) => {
    const nextStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setStatus', keyId, status: nextStatus }),
      });
      fetchKeys();
    } catch (err) {
      console.error('Failed to toggle key status:', err);
    }
  };

  const handleDeleteCustomKey = async (keyId: string) => {
    try {
      await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', keyId }),
      });
      fetchKeys();
    } catch (err) {
      console.error('Failed to delete key:', err);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecret.trim()) return;

    setIsSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          provider: newProvider,
          label: newLabel || undefined,
          keySecret: newSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorBanner(data.error || 'Failed to add API key');
      } else {
        setShowAddModal(false);
        setNewLabel('');
        setNewSecret('');
        fetchKeys();
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (key: Omit<ApiKeyRecord, 'keySecret'>) => {
    const now = Date.now();
    const isCoolingDown = key.status === 'RATE_LIMITED' && key.cooldownUntil && key.cooldownUntil > now;
    const cooldownSecsRemaining = isCoolingDown 
      ? Math.ceil((key.cooldownUntil! - now) / 1000) 
      : 0;

    switch (key.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> RATE LIMITED ({cooldownSecsRemaining}s)
          </span>
        );
      case 'QUOTA_EXHAUSTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <AlertTriangle className="w-3 h-3" /> QUOTA EXHAUSTED
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> INVALID KEY
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            DISABLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            ERROR
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            API Key Manager & Rotation
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manajemen multi-key untuk tiap provider, rotasi otomatis, pemantauan cooldown rate limit, dan isolasi keamanan backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchKeys}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#212738] hover:bg-[#1a2030] text-xs font-medium text-zinc-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah API Key</span>
          </button>
        </div>
      </div>

      {/* Security Note Box */}
      <div className="bg-[#121624] border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 leading-relaxed">
          <span className="font-semibold text-white">Prinsip Keamanan:</span> Seluruh API key hanya disimpan dan diproses pada backend server. Frontend hanya menerima data termasker (`gsk_...`) dan metadata statistik request untuk menjamin kerahasiaan kredensial.
        </div>
      </div>

      {/* Keys Table */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1b202e] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Daftar API Keys Terdaftar</h2>
          <span className="text-xs text-zinc-400 font-mono">{keys.length} Keys Terdeteksi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1b202e] text-zinc-500 font-medium bg-[#0b0d14]">
                <th className="py-3 px-5">Provider</th>
                <th className="py-3 px-4">Label & Sumber</th>
                <th className="py-3 px-4">Key Masked</th>
                <th className="py-3 px-4">Status Gateway</th>
                <th className="py-3 px-4">Total Request</th>
                <th className="py-3 px-4">Terakhir Digunakan</th>
                <th className="py-3 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171a26]">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-[#131622] text-zinc-300">
                  <td className="py-3.5 px-5 font-semibold text-white capitalize flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{k.provider}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-zinc-200">{k.label}</p>
                    <span className="text-[10px] font-mono uppercase text-zinc-500">{k.source}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-zinc-400 bg-zinc-950/40 px-2 rounded">
                    {k.keyMasked}
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(k)}</td>
                  <td className="py-3.5 px-4 font-mono text-zinc-300">{k.totalRequests}</td>
                  <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                    {k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Belum pernah'}
                  </td>
                  <td className="py-3.5 px-5 text-right space-x-1.5">
                    {/* Reset cooldown button if rate limited */}
                    {k.status === 'RATE_LIMITED' && (
                      <button
                        onClick={() => handleResetCooldown(k.id)}
                        className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-medium transition-colors"
                        title="Reset Cooldown ke ACTIVE"
                      >
                        Reset Cooldown
                      </button>
                    )}

                    {/* Enable/Disable toggle */}
                    <button
                      onClick={() => handleToggleDisable(k.id, k.status)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        k.status === 'DISABLED'
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-[#1e2333] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {k.status === 'DISABLED' ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>

                    {/* Delete custom key if source=user */}
                    {k.source === 'user' && (
                      <button
                        onClick={() => handleDeleteCustomKey(k.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Hapus API Key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    Tidak ada API key yang terkonfigurasi pada environment atau database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0f121a] border border-[#212738] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b202e]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" /> Tambah API Key Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            {errorBanner && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleAddKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Provider Target</label>
                <select
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value as any)}
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="groq">Groq</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="cloudflare">Cloudflare Workers AI (Token:AccountId)</option>
                  <option value="nvidia">NVIDIA NIM</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Label / Nama Identifier</label>
                <input
                  type="text"
                  placeholder="Contoh: Groq Backup 3"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">API Key Secret</label>
                <input
                  type="password"
                  placeholder="Masukkan API key rahasia..."
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  required
                  className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg p-2.5 font-mono focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Kunci akan disimpan di backend dan di-masking untuk keamanan.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg bg-[#181d2a] hover:bg-[#202738] text-zinc-300 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newSecret.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

