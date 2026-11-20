'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  Key, 
  Zap, 
  Sparkles, 
  Globe, 
  Cloud, 
  Cpu, 
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface ProviderTutorial {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  url: string;
  urlLabel: string;
  freeTierInfo: string;
  envVariable: string;
  steps: {
    title: string;
    description: string;
    tip?: string;
  }[];
  modelRecommendations: string[];
}

export function TutorialView() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('groq');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const tutorials: ProviderTutorial[] = [
    {
      id: 'groq',
      name: 'Groq Cloud',
      tagline: 'Inference LPU tercepat di dunia untuk model Open Source (Llama, GPT-OSS, Qwen)',
      badge: 'Free Tier Sangat Cepat & Direkomendasikan',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: Zap,
      url: 'https://console.groq.com/keys',
      urlLabel: 'console.groq.com/keys',
      freeTierInfo: 'Gratis tanpa kartu kredit dengan rate limit harian yang cukup tinggi untuk development.',
      envVariable: 'GROQ_API_KEY_1',
      steps: [
        {
          title: 'Buka Console Groq',
          description: 'Kunjungi https://console.groq.com dan buat akun menggunakan akun Google atau GitHub Anda.',
        },
        {
          title: 'Buka Menu API Keys',
          description: 'Pada bilah navigasi kiri, klik menu "API Keys" atau langsung menuju https://console.groq.com/keys.',
        },
        {
          title: 'Buat Key Baru',
          description: 'Klik tombol "Create API Key". Beri nama yang deskriptif, misalnya "Chatbot Gateway".',
        },
        {
          title: 'Salin API Key',
          description: 'Salin key yang berawalan `gsk_...`. Pastikan langsung menyimpannya karena key hanya ditampilkan satu kali oleh Groq.',
          tip: 'Key Groq formatnya: gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        },
        {
          title: 'Pasang ke Aplikasi',
          description: 'Buka tab "API Key Manager" di chatbot ini atau masukkan ke file .env sebagai GROQ_API_KEY_1.',
        }
      ],
      modelRecommendations: [
        'openai/gpt-oss-20b (Sangat cepat, reasoning kuat, default)',
        'qwen/qwen3.8-27b (Bagus untuk multilingual & logic)',
        'llama-3.1-8b-instant (Super hemat latency)'
      ]
    },
    {
      id: 'gemini',
      name: 'Google Gemini (Google AI Studio)',
      tagline: 'Model AI multimodal canggih dari Google dengan kuota gratis 15 RPM & 1.000.000 token konteks',
      badge: 'Free Tier 1M Token Context',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      icon: Sparkles,
      url: 'https://aistudio.google.com/app/apikey',
      urlLabel: 'aistudio.google.com/app/apikey',
      freeTierInfo: 'Free tier mencakup hingga 15 Request Per Minute (RPM) dan 1 juta token context window.',
      envVariable: 'GEMINI_API_KEY_1',
      steps: [
        {
          title: 'Buka Google AI Studio',
          description: 'Akses https://aistudio.google.com dengan login menggunakan akun Google Anda.',
        },
        {
          title: 'Buka Bagian "Get API key"',
          description: 'Di panel sebelah kiri atau kanan atas, klik tombol "Get API key".',
        },
        {
          title: 'Buat API Key di Proyek Baru',
          description: 'Klik tombol "Create API key". Anda dapat memilih "Create API key in new project" jika belum memiliki Google Cloud Project.',
        },
        {
          title: 'Salin Key',
          description: 'Salin API key yang muncul (biasanya berawalan `AIzaSy...`).',
          tip: 'Google AI Studio tidak mewajibkan kartu kredit untuk tingkatan Free Tier.'
        },
        {
          title: 'Simpan ke Aplikasi',
          description: 'Simpan ke menu "API Key Manager" (pilih provider Google Gemini) atau tambahkan ke `.env` sebagai GEMINI_API_KEY_1.',
        }
      ],
      modelRecommendations: [
        'gemini-2.0-flash (Model generasi terbaru, super cepat)',
        'gemini-1.5-flash (Stabil, efisien, serbaguna)',
        'gemini-1.5-pro (Kemampuan reasoning mendalam & analisis file besar)'
      ]
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      tagline: 'Satu API gateway terpadu untuk mengakses 200+ model AI (DeepSeek R1, Llama 3, Claude, dsb)',
      badge: 'Banyak Model Free-Tier (:free)',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: Globe,
      url: 'https://openrouter.ai/keys',
      urlLabel: 'openrouter.ai/keys',
      freeTierInfo: 'Menyediakan model-model bertanda `:free` yang dapat digunakan tanpa deposit saldo.',
      envVariable: 'OPENROUTER_API_KEY_1',
      steps: [
        {
          title: 'Daftar Akun OpenRouter',
          description: 'Buka https://openrouter.ai dan klik "Sign In" menggunakan Google, GitHub, atau email.',
        },
        {
          title: 'Masuk ke Halaman Keys',
          description: 'Klik avatar Anda di pojok kanan atas, lalu pilih "Keys" atau buka https://openrouter.ai/keys.',
        },
        {
          title: 'Buat Key Baru (Create Key)',
          description: 'Klik tombol "Create Key", beri nama (misal: "Gateway Chatbot"), lalu tentukan credit limit (opsional, kosongkan saja).',
        },
        {
          title: 'Salin Key',
          description: 'Salin key yang berawalan `sk-or-v1-...`. Simpan baik-baik.',
          tip: 'Untuk memakai gratis, pilih model yang berakhiran `:free` seperti meta-llama/llama-3.2-3b-instruct:free.'
        },
        {
          title: 'Simpan ke Gateway',
          description: 'Tambahkan key di tab API Key Manager atau masukkan ke file `.env` sebagai OPENROUTER_API_KEY_1.',
        }
      ],
      modelRecommendations: [
        'meta-llama/llama-3.2-3b-instruct:free (Gratis & responsif)',
        'google/gemini-2.0-flash-exp:free (Eksperimental gratis)',
        'deepseek/deepseek-r1:free (Model penalaran chain-of-thought gratis)'
      ]
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Workers AI',
      tagline: 'Serverless GPU inference yang berjalan langsung di jaringan global edge Cloudflare',
      badge: '10.000 Neuron/Hari Gratis',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Cloud,
      url: 'https://dash.cloudflare.com/',
      urlLabel: 'dash.cloudflare.com',
      freeTierInfo: 'Mendapatkan kuota 10.000 neuron gratis setiap harinya untuk inferensi model open-source.',
      envVariable: 'CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN',
      steps: [
        {
          title: 'Buka Dashboard Cloudflare',
          description: 'Masuk ke https://dash.cloudflare.com/. Jika belum punya akun, daftar gratis terlebih dahulu.',
        },
        {
          title: 'Ambil Account ID',
          description: 'Di halaman dashboard utama (overview), lihat bilah sisi kanan bawah atau di URL browser, cari string "Account ID" (32 karakter hex) dan salin.',
        },
        {
          title: 'Buat API Token',
          description: 'Buka My Profile > API Tokens > Create Token. Pilih template "Workers AI" atau buat Custom Token dengan izin: Account -> Workers AI -> Read/Edit.',
        },
        {
          title: 'Simpan Token',
          description: 'Salin token API yang dihasilkan.',
          tip: 'Cloudflare membutuhkan DUA konfigurasi: Account ID dan API Token.'
        },
        {
          title: 'Masukkan ke .env',
          description: 'Tambahkan CLOUDFLARE_ACCOUNT_ID=xxx dan CLOUDFLARE_API_TOKEN=yyy ke file .env proyek Anda.',
        }
      ],
      modelRecommendations: [
        '@cf/meta/llama-3-8b-instruct (Handal dan efisien)',
        '@cf/mistral/mistral-7b-instruct-v0.2 (Kemampuan coding dan penalaran)'
      ]
    },
    {
      id: 'nvidia',
      name: 'NVIDIA NIM (Build.nvidia.com)',
      tagline: 'Microservices inference teroptimasi di atas infrastruktur GPU NVIDIA AI Enterprise',
      badge: '1.000 Free Inference Credits',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: Cpu,
      url: 'https://build.nvidia.com/',
      urlLabel: 'build.nvidia.com',
      freeTierInfo: 'Pengguna baru mendapatkan 1.000 free inference credits saat mendaftar akun developer.',
      envVariable: 'NVIDIA_API_KEY_1',
      steps: [
        {
          title: 'Buka NVIDIA Build',
          description: 'Kunjungi https://build.nvidia.com/ dan klik tombol "Login" atau "Join NVIDIA Developer".',
        },
        {
          title: 'Pilih Model Katalog',
          description: 'Pilih salah satu model populer, misalnya "meta/llama-3.1-8b-instruct" atau "nvidia/llama-3.1-nemotron-70b-instruct".',
        },
        {
          title: 'Klik "Get API Key"',
          description: 'Di halaman model tersebut, klik tombol hijau "Get API Key" di samping playground.',
        },
        {
          title: 'Generate & Salin Key',
          description: 'Salin API key yang berawalan `nvapi-...`.',
          tip: 'Pastikan akun email developer NVIDIA Anda sudah terverifikasi.'
        },
        {
          title: 'Konfigurasikan di Gateway',
          description: 'Masukkan key ke tab "API Key Manager" atau tambahkan ke `.env` sebagai NVIDIA_API_KEY_1.',
        }
      ],
      modelRecommendations: [
        'meta/llama-3.1-8b-instruct (Ultra-fast inference)',
        'nvidia/llama-3.1-nemotron-70b-instruct (Sangat presisi untuk reasoning)'
      ]
    }
  ];

  const activeTutorial = tutorials.find((t) => t.id === selectedProviderId) || tutorials[0];
  const IconComponent = activeTutorial.icon;

  return (
    <div className="flex-1 overflow-y-auto bg-[#090a0f] p-8 space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          Panduan &amp; Tutorial Mendapatkan API Key
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Langkah mudah dan resmi untuk mendaftar serta memperoleh API key gratis dari 5 AI provider terkemuka.
        </p>
      </div>

      {/* Info Card Banner */}
      <div className="bg-[#101422] border border-[#1d2438] rounded-xl p-4 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 leading-relaxed">
          <p className="font-semibold text-white">Prinsip Multi-Provider Gateway:</p>
          <p className="text-zinc-400 mt-0.5">
            Semakin banyak provider yang Anda daftarkan, semakin tinggi ketahanan sistem. Jika salah satu provider mengalami limit kuota (429) atau downtime, AI Gateway akan <strong className="text-indigo-300">otomatis failover</strong> ke provider berikutnya tanpa mengganggu obrolan Anda.
          </p>
        </div>
      </div>

      {/* Provider Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#1a1e2b] pb-4">
        {tutorials.map((t) => {
          const isSelected = t.id === selectedProviderId;
          const TIcon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedProviderId(t.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-[#121520] border border-[#1f2538] text-zinc-400 hover:text-zinc-200 hover:bg-[#181d2c]'
              }`}
            >
              <TIcon className="w-4 h-4" />
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tutorial Content Box */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-6">
        {/* Header of Selected Provider */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1a1e2b]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#171b28] border border-[#232a3f] flex items-center justify-center text-indigo-400 shadow-sm">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white">{activeTutorial.name}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${activeTutorial.badgeColor}`}>
                  {activeTutorial.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{activeTutorial.tagline}</p>
            </div>
          </div>

          <a
            href={activeTutorial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all w-fit"
          >
            <span>Buka Console {activeTutorial.name}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Free Tier Info & Env Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#141824] border border-[#212738] space-y-1">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Informasi Free Tier
            </span>
            <p className="text-zinc-200 leading-relaxed">{activeTutorial.freeTierInfo}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#141824] border border-[#212738] space-y-1">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" /> Variabel .env Terkait
            </span>
            <div className="flex items-center justify-between bg-[#0b0d14] px-2.5 py-1.5 rounded border border-[#1b2030] font-mono text-[11px] text-zinc-300">
              <span>{activeTutorial.envVariable}</span>
              <button
                onClick={() => copyToClipboard(activeTutorial.envVariable, 'env')}
                className="hover:text-white text-zinc-500 transition-colors p-0.5"
                title="Salin nama variabel"
              >
                {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Langkah-Langkah Memperoleh API Key:
          </h3>

          <div className="space-y-3">
            {activeTutorial.steps.map((step, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-[#131622] border border-[#1e2436] transition-colors hover:border-indigo-500/30"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-xs font-semibold text-white">{step.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
                  {step.tip && (
                    <div className="mt-2 text-[11px] font-mono text-indigo-300/90 bg-indigo-950/30 border border-indigo-800/30 px-2.5 py-1.5 rounded">
                      💡 Tip: {step.tip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Models */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Rekomendasi Model yang Didukung:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {activeTutorial.modelRecommendations.map((mod, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#141824] border border-[#212738] text-xs font-mono text-zinc-300">
                <span className="text-indigo-400 font-bold mr-1.5">•</span>
                {mod}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Link to API Key Manager */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-violet-950/30 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white">Sudah mendapatkan API Key?</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Anda bisa langsung memasukkannya ke sistem tanpa perlu me-restart server.
            </p>
          </div>
          <a
            href="#keys"
            onClick={(e) => {
              e.preventDefault();
              // Trigger click on parent sidebar key tab if available
              const keyBtn = document.querySelector('button[data-tab="keys"]') as HTMLButtonElement;
              if (keyBtn) keyBtn.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            <span>Buka API Key Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="bg-[#0f121a] border border-[#1b202e] rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" /> Tips Keamanan Menyimpan API Key
        </h3>
        <ul className="text-xs text-zinc-400 space-y-2 list-disc list-inside leading-relaxed">
          <li>
            <strong className="text-zinc-200">Jangan pernah meng-commit file `.env`:</strong> Pastikan file `.env` selalu berada di dalam `.gitignore` agar tidak ter-push ke repository publik GitHub.
          </li>
          <li>
            <strong className="text-zinc-200">Gunakan Quota &amp; Rate Limit:</strong> Pada masing-masing console provider, atur pembatas penggunaan (spending limit / hard cap $0) agar tidak terjadi tagihan tak terduga.
          </li>
          <li>
            <strong className="text-zinc-200">Masking Key:</strong> Dashboard ini secara otomatis melakukan sensor/masking pada semua key (`gsk_***`, `AIza***`) sehingga aman saat layar Anda dilihat orang lain.
          </li>
        </ul>
      </div>
    </div>
  );
}
