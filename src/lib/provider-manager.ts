import { IProviderAdapter } from './adapters/base';
import { GroqAdapter } from './adapters/groq';
import { GeminiAdapter } from './adapters/gemini';
import { OpenRouterAdapter } from './adapters/openrouter';
import { CloudflareAdapter } from './adapters/cloudflare';
import { NvidiaAdapter } from './adapters/nvidia';
import { ProviderId } from './types';
import { PROVIDERS_CONFIG } from './providers-config';
import { db } from './store';

export class ProviderManager {
  private static instance: ProviderManager;
  private adapters: Map<ProviderId, IProviderAdapter> = new Map();

  private constructor() {
    this.adapters.set('groq', new GroqAdapter());
    this.adapters.set('gemini', new GeminiAdapter());
    this.adapters.set('openrouter', new OpenRouterAdapter());
    this.adapters.set('cloudflare', new CloudflareAdapter());
    this.adapters.set('nvidia', new NvidiaAdapter());
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  public getAdapter(provider: ProviderId): IProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Provider adapter for "${provider}" not found`);
    }
    return adapter;
  }

  public isProviderEnabled(provider: ProviderId): boolean {
    const states = db.getProviderEnabled();
    return states[provider] !== false;
  }

  public getActiveProviderOrder(primaryPreferred?: ProviderId): ProviderId[] {
    const defaultOrder: ProviderId[] = ['groq', 'gemini', 'openrouter', 'cloudflare', 'nvidia'];
    
    // Filter by enabled state in store
    const enabledProviders = defaultOrder.filter((p) => this.isProviderEnabled(p));

    if (primaryPreferred && enabledProviders.includes(primaryPreferred)) {
      // Move preferred provider to front
      return [primaryPreferred, ...enabledProviders.filter((p) => p !== primaryPreferred)];
    }

    return enabledProviders;
  }

  public getDefaultModel(provider: ProviderId): string {
    return PROVIDERS_CONFIG[provider]?.defaultModel || 'default';
  }
}

export const providerManager = ProviderManager.getInstance();

