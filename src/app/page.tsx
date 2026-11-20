'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, TabType } from '@/components/Sidebar';
import { ChatView } from '@/components/views/ChatView';
import { OverviewView } from '@/components/views/OverviewView';
import { ProvidersView } from '@/components/views/ProvidersView';
import { ApiKeysView } from '@/components/views/ApiKeysView';
import { UsageView } from '@/components/views/UsageView';
import { QualityView } from '@/components/views/QualityView';
import { SettingsView } from '@/components/views/SettingsView';
import { ModelInfo } from '@/lib/types';

export default function HomePage() {
  const [currentTab, setCurrentTab] = useState<TabType>('chat');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [hasActiveKey, setHasActiveKey] = useState<boolean>(true);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.success && data.models) {
        setModels(data.models);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const checkKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (data.success && data.keys) {
        const active = data.keys.some((k: any) => k.status === 'ACTIVE');
        setHasActiveKey(active);
      }
    } catch (err) {
      console.error('Failed to check keys:', err);
    }
  };

  useEffect(() => {
    fetchModels();
    checkKeys();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeProviderName="Groq"
        hasActiveKey={hasActiveKey}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentTab === 'chat' && (
          <ChatView models={models} defaultProvider="groq" />
        )}
        {currentTab === 'overview' && (
          <OverviewView onNavigateTab={setCurrentTab} />
        )}
        {currentTab === 'quality' && <QualityView />}
        {currentTab === 'providers' && (
          <ProvidersView models={models} onRefreshModels={fetchModels} />
        )}
        {currentTab === 'keys' && <ApiKeysView />}
        {currentTab === 'usage' && <UsageView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

