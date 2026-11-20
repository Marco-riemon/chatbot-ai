'use client';

import React from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Cpu, 
  KeyRound, 
  BarChart3, 
  Settings, 
  ShieldCheck,
  Zap,
  Sparkles,
  BookOpen
} from 'lucide-react';

export type TabType = 'chat' | 'overview' | 'providers' | 'keys' | 'usage' | 'quality' | 'settings' | 'tutorial';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeProviderName?: string;
  hasActiveKey?: boolean;
}

export function Sidebar({ currentTab, onSelectTab, activeProviderName = 'Groq', hasActiveKey = true }: SidebarProps) {
  const navItems = [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tutorial', label: 'Tutorial', icon: BookOpen },
    { id: 'quality', label: 'Quality & Evaluation', icon: Sparkles },
    { id: 'providers', label: 'Providers & Models', icon: Cpu },
    { id: 'keys', label: 'API Key Manager', icon: KeyRound },
    { id: 'usage', label: 'Usage & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Gateway Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-[#0d0f17] border-r border-[#1a1e2b] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1a1e2b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                AI Gateway
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-medium">v1.2</span>
              </h1>
              <p className="text-[11px] text-zinc-400">Quality-Driven Multi-Router</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                data-tab={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#151823]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Gateway Status Badge */}
      <div className="p-4 border-t border-[#1a1e2b]">
        <div className="bg-[#121520] border border-[#1f2538] rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasActiveKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              Gateway Status
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              Live
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 font-medium">
            Primary: <span className="text-indigo-400">{activeProviderName}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-[#1c2233] flex items-center justify-between text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" /> Auto Failover & RAG
            </span>
            <span className="text-zinc-400 font-mono">5 Providers</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
