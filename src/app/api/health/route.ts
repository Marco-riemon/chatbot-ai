import { NextRequest, NextResponse } from 'next/server';
import { keyManager } from '@/lib/key-manager';
import { providerManager } from '@/lib/provider-manager';
import { ProviderId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const providerParam = req.nextUrl.searchParams.get('provider') as ProviderId | null;

  if (providerParam) {
    const key = keyManager.getNextActiveKey(providerParam);
    if (!key) {
      return NextResponse.json({
        provider: providerParam,
        healthy: false,
        error: 'No active key configured for this provider',
      });
    }

    try {
      const adapter = providerManager.getAdapter(providerParam);
      const res = await adapter.checkConnection(key.keySecret);
      return NextResponse.json({
        provider: providerParam,
        healthy: res.success,
        latencyMs: res.latencyMs,
        error: res.error,
      });
    } catch (err: any) {
      return NextResponse.json({
        provider: providerParam,
        healthy: false,
        error: err.message,
      });
    }
  }

  // Check all providers with keys
  const results: Record<string, any> = {};
  const providers: ProviderId[] = ['groq', 'gemini', 'openrouter', 'cloudflare', 'nvidia'];

  for (const p of providers) {
    const key = keyManager.getNextActiveKey(p);
    if (!key) {
      results[p] = { healthy: false, status: 'NO_KEY', message: 'No active key' };
      continue;
    }

    try {
      const adapter = providerManager.getAdapter(p);
      const ping = await adapter.checkConnection(key.keySecret);
      results[p] = {
        healthy: ping.success,
        latencyMs: ping.latencyMs,
        error: ping.error,
      };
    } catch (e: any) {
      results[p] = {
        healthy: false,
        error: e.message,
      };
    }
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: results,
  });
}
