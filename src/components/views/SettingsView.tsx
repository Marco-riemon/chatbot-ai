'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Zap, FileCode, CheckCircle2, AlertCircle, FolderOpen, Eye, EyeOff, AlertTriangle, RefreshCw, HardDrive, Lock, Unlock } from 'lucide-react';

interface WorkspaceConfig {
  rootPath: string;
  readOnly: boolean;
  requireConfirmation: boolean;
  enabled: boolean;
}

interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export function SettingsView() {
  const [workspace, setWorkspace] = useState<WorkspaceConfig>({
    rootPath: '',
    readOnly: false,
    requireConfirmation: true,
    enabled: false,
  });
  const [dirListing, setDirListing] = useState<DirectoryEntry[]>([]);
  const [pathInput, setPathInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isLoadingDir, setIsLoadingDir] = useState(false);

  useEffect(() => {
    fetchWorkspaceConfig();
  }, []);

  const fetchWorkspaceConfig = async () => {
    try {
      const res = await fetch('/api/workspace');
      const data = await res.json();
      if (data.success) {
        setWorkspace(data.config);
        setPathInput(data.config.rootPath || '');
        setDirListing(data.listing || []);
      }
    } catch (err) {
      console.error('Failed to fetch workspace config:', err);
    }
  };

  const handleSaveWorkspace = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rootPath: pathInput.trim(),
          readOnly: workspace.readOnly,
          requireConfirmation: workspace.requireConfirmation,
          enabled: workspace.enabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('success');
        setSaveMsg('Konfigurasi workspace berhasil disimpan.');
        setWorkspace(data.config);
        // Refresh directory listing
        setIsLoadingDir(true);
        const r2 = await fetch('/api/workspace');
        const d2 = await r2.json();
        if (d2.success) {
          setDirListing(d2.listing || []);
          setWorkspace(d2.config);
          setPathInput(d2.config.rootPath || '');
        }
        setIsLoadingDir(false);
      } else {
        setSaveStatus('error');
        setSaveMsg(data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMsg(err.message || 'Network error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const toggleReadOnly = () => setWorkspace((prev) => ({ ...prev, readOnly: !prev.readOnly }));
  const toggleRequireConfirm = () => setWorkspace((prev) => ({ ...prev, requireConfirmation: !prev.requireConfirmation }));
  const toggleEnabled = () => setWorkspace((prev) => ({ ...prev, enabled: !prev.enabled }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Gateway Configuration &amp; Environment
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Parameter operasional AI Gateway, konfigurasi workspace lokal, alur failover fail-safe, dan referensi environment variables.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════
          WORKSPACE CONFIGURATION
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" /> Workspace Lokal — Filesystem Tool
          </h2>
          {/* Enable/Disable toggle */}
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              workspace.enabled
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${workspace.enabled ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-500'}`} />
            {workspace.enabled ? 'Aktif' : 'Nonaktif'}
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Aktifkan fitur ini untuk mengizinkan AI chatbot membaca, membuat, mengedit, dan menghapus file di dalam folder project yang Anda pilih. Semua operasi tulis berjalan melalui sistem <strong className="text-zinc-200">proposal + konfirmasi</strong> agar tidak ada perubahan yang tidak disengaja.
        </p>

        {/* Security warning */}
        <div className="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold text-amber-300">Lapisan Keamanan Aktif</p>
            <ul className="text-amber-400/80 space-y-0.5 list-disc list-inside">
              <li>Sandbox ketat: AI hanya dapat mengakses file di dalam <code className="font-mono bg-black/30 px-1 rounded">rootPath</code></li>
              <li>File sensitif diblokir: <code className="font-mono bg-black/30 px-1 rounded">.env</code>, <code className="font-mono bg-black/30 px-1 rounded">.git/</code>, <code className="font-mono bg-black/30 px-1 rounded">id_rsa</code>, <code className="font-mono bg-black/30 px-1 rounded">.bashrc</code></li>
              <li>Path traversal (<code className="font-mono bg-black/30 px-1 rounded">../</code>) diblokir sepenuhnya</li>
              <li>Semua operasi tulis/hapus memerlukan konfirmasi eksplisit Anda</li>
            </ul>
          </div>
        </div>

        {/* Root path input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">
            Folder Proyek (Root Path)
          </label>
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="Contoh: /Users/nama/Documents/Project/MyApp"
            className="w-full bg-[#141824] border border-[#212738] text-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          />
          <p className="text-[11px] text-zinc-500">Gunakan path absolut. AI tidak dapat mengakses file di luar folder ini.</p>
        </div>

        {/* Toggle options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Read-Only Mode */}
          <button
            onClick={toggleReadOnly}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              workspace.readOnly
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                : 'bg-[#141824] border-[#212738] text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {workspace.readOnly ? <Lock className="w-4 h-4 shrink-0" /> : <Unlock className="w-4 h-4 shrink-0" />}
            <div>
              <p className="text-xs font-semibold">{workspace.readOnly ? 'Mode Read-Only (Aktif)' : 'Mode Read-Only (Nonaktif)'}</p>
              <p className="text-[11px] opacity-70 mt-0.5">AI hanya bisa membaca file, tidak bisa menulis atau menghapus</p>
            </div>
          </button>

          {/* Require Confirmation */}
          <button
            onClick={toggleRequireConfirm}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              workspace.requireConfirmation
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-[#141824] border-[#212738] text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${workspace.requireConfirmation ? 'text-emerald-400' : ''}`} />
            <div>
              <p className="text-xs font-semibold">{workspace.requireConfirmation ? 'Konfirmasi Wajib (Aktif)' : 'Konfirmasi Wajib (Nonaktif)'}</p>
              <p className="text-[11px] opacity-70 mt-0.5">Setiap operasi tulis/hapus menunggu persetujuan Anda dulu</p>
            </div>
          </button>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSaveWorkspace}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            {isSaving ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan…</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Simpan Konfigurasi</>
            )}
          </button>
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveMsg}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" /> {saveMsg}
            </span>
          )}
        </div>

        {/* Directory preview */}
        {workspace.rootPath && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" /> Isi Folder Workspace
              </p>
              <button
                onClick={fetchWorkspaceConfig}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {isLoadingDir ? (
              <div className="text-xs text-zinc-500 py-3 text-center">Memuat daftar folder…</div>
            ) : dirListing.length === 0 ? (
              <div className="text-xs text-zinc-500 py-3 text-center italic">Folder kosong atau path belum dikonfigurasi.</div>
            ) : (
              <div className="bg-[#0b0d14] border border-[#1c2130] rounded-lg p-3 max-h-48 overflow-y-auto space-y-0.5">
                {dirListing.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 py-0.5 hover:text-zinc-200 transition-colors">
                    <span className={entry.type === 'directory' ? 'text-indigo-400' : 'text-zinc-500'}>
                      {entry.type === 'directory' ? '📁' : '📄'}
                    </span>
                    <span className="truncate">{entry.name}</span>
                    {entry.type === 'directory' && <span className="text-zinc-600 text-[10px]">/</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          GATEWAY ARCHITECTURE SETTINGS
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" /> Aturan Automatic Failover &amp; Retry
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-[#141824] border border-[#212738]">
            <span className="text-zinc-400 font-medium">Default Failover Order</span>
            <p className="text-white font-mono mt-1 font-semibold">
              Groq → Gemini → OpenRouter → Cloudflare → NVIDIA
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Dapat ditentukan manual per request oleh pengguna atau otomatis.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#141824] border border-[#212738]">
            <span className="text-zinc-400 font-medium">Rate Limit Cooldown</span>
            <p className="text-emerald-400 font-mono mt-1 font-semibold">60 Detik</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Key berstatus 429 otomatis kembali ACTIVE setelah masa cooldown selesai.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[#141824] border border-[#212738]">
            <span className="text-zinc-400 font-medium">Request Timeout</span>
            <p className="text-indigo-400 font-mono mt-1 font-semibold">30,000 ms (30s)</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Jika provider tidak merespon dalam 30s, gateway beralih ke fallback.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ENVIRONMENT REFERENCE GUIDE
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" /> Referensi Konfigurasi .env
          </h2>
          <span className="text-xs text-zinc-500 font-mono">File: .env</span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Sistem membaca variabel lingkungan saat startup. Anda dapat menambahkan multiple API key untuk provider yang sama guna mengaktifkan load-balancing dan rotasi otomatis.
        </p>

        <pre className="text-xs text-zinc-300 font-mono leading-relaxed bg-[#0b0d14] p-4 rounded-lg border border-[#1c2130] overflow-x-auto">
{`# 1. GROQ PROVIDER (Prioritas Utama untuk High-Speed Inference)
GROQ_API_KEY_1=
GROQ_API_KEY_2=
GROQ_API_KEY_3=

# 2. GOOGLE GEMINI (Model Multimodal Berkapasitas Besar)
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=

# 3. OPENROUTER (Agregator 200+ Model dengan Opsi Free Tier)
OPENROUTER_API_KEY_1=
OPENROUTER_API_KEY_2=

# 4. CLOUDFLARE WORKERS AI (Serverless Edge GPU Inference)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# 5. NVIDIA NIM (Microservices Inference Teroptimasi)
NVIDIA_API_KEY_1=
NVIDIA_API_KEY_2=`}
        </pre>
      </div>

      {/* ═══════════════════════════════════════════════════════
          PERSISTENT STORAGE INFO
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Penyimpanan &amp; Database Lokal
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Aplikasi menggunakan embedded persistent store di <code className="text-indigo-300 bg-zinc-900 px-1.5 py-0.5 rounded">data/store.json</code> dengan penulisan file atomik untuk menyimpan:
        </p>
        <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
          <li>Riwayat percakapan pengguna (<code className="text-zinc-400">conversations</code> &amp; <code className="text-zinc-400">messages</code>)</li>
          <li>Log audit token &amp; failover (<code className="text-zinc-400">usage_logs</code>)</li>
          <li>Status API key, kegagalan request, &amp; cooldown (<code className="text-zinc-400">keyStateOverrides</code>)</li>
          <li>Custom API key yang didaftarkan melalui UI</li>
          <li>Skills Markdown &amp; konfigurasi workspace lokal</li>
        </ul>
      </div>
    </div>
  );
}
